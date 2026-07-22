import {
  getSessionAccessToken,
  getSessionRefreshToken,
  persistOAuthSessionTokens,
} from './api';
import { authApi } from './auth';
import { clearFirstPageFeedCache } from '../utils/feedCache';

export function pickAccessToken(source) {
  return source?.accessToken ?? source?.access_token ?? null;
}

/** Зберегти user + accessToken у Zustand і sessionStorage. Без JWT — не позначати сесію автентифікованою. */
export function applyAuthFromSession(setAuth, user, accessToken) {
  if (!user) {
    setAuth({ user: null, token: null, isAuthed: false });
    return null;
  }

  const token = accessToken ?? getSessionAccessToken();
  if (!token) {
    return null;
  }

  persistOAuthSessionTokens(token);

  setAuth({
    user,
    token,
    isAuthed: true,
  });

  return token;
}

/**
 * Після OAuth / reload: якщо /users/me OK, але JWT лише в cookie — отримати accessToken через /auth/refresh.
 */
export async function ensureAccessTokenInStore(setAuth, user, accessToken) {
  const applied = applyAuthFromSession(setAuth, user, accessToken);
  if (applied) return applied;

  if (!user) return null;

  try {
    const refreshData = await authApi.refresh();
    return applyAuthFromSession(setAuth, user, pickAccessToken(refreshData));
  } catch (err) {
    if (err?.response?.status !== 401) {
      console.warn('[authSession] ensureAccessToken failed:', err?.response?.data ?? err?.message);
    }
    return null;
  }
}

/** Production flow: /users/me → (401) /auth/refresh → /users/me + token у store. */
export async function restoreOAuthSession(setAuth) {
  clearFirstPageFeedCache();

  let accessFromQuery = null;
  let refreshFromQuery = null;

  if (typeof window !== 'undefined' && window.location.search.length > 1) {
    const params = new URLSearchParams(window.location.search);
    accessFromQuery = params.get('access_token');
    refreshFromQuery = params.get('refresh_token');
    if (accessFromQuery || refreshFromQuery) {
      persistOAuthSessionTokens(
        accessFromQuery ?? undefined,
        refreshFromQuery ?? undefined,
      );
    }
  }

  const queryAccess = accessFromQuery ?? getSessionAccessToken();

  // JWT з query/sessionStorage одразу в Zustand (до async /users/me).
  if (queryAccess) {
    setAuth({ token: queryAccess });
  }

  try {
    const user = await authApi.me();
    const token = await ensureAccessTokenInStore(setAuth, user, queryAccess);
    if (!token) {
      throw new Error('Session restored without access token');
    }
    return user;
  } catch (meErr) {
    const refreshToken = refreshFromQuery ?? getSessionRefreshToken();
    if (!refreshToken && !queryAccess) {
      throw meErr;
    }

    const refreshData = await authApi.refresh();
    const user = await authApi.me();
    const token = await ensureAccessTokenInStore(
      setAuth,
      user,
      pickAccessToken(refreshData) ?? queryAccess ?? getSessionAccessToken(),
    );
    if (!token) {
      throw meErr;
    }
    return user;
  }
}

export function readOAuthQueryTokens() {
  if (typeof window === 'undefined' || window.location.search.length <= 1) {
    return { accessToken: null, refreshToken: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
}
