import {
  getSessionAccessToken,
  persistOAuthSessionTokens,
} from './api';
import { authApi } from './auth';
import { clearFirstPageFeedCache } from '../utils/feedCache';

export function pickAccessToken(source) {
  return source?.accessToken ?? source?.access_token ?? null;
}

/** Зберегти user + accessToken у Zustand. Refresh — лише httpOnly cookie. */
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

export function readOAuthCodeFromQuery() {
  if (typeof window === 'undefined' || window.location.search.length <= 1) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('oauth_code')?.trim() || null;
}

/** @deprecated Legacy redirect; remove after backend deploy window. */
export function readLegacyOAuthTokensFromQuery() {
  if (typeof window === 'undefined' || window.location.search.length <= 1) {
    return { accessToken: null, refreshToken: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
}

async function resolveOAuthAccessToken() {
  const oauthCode = readOAuthCodeFromQuery();
  if (oauthCode) {
    const data = await authApi.exchangeOAuthCode(oauthCode);
    const access = pickAccessToken(data);
    if (access) persistOAuthSessionTokens(access);
    return access;
  }

  const legacy = readLegacyOAuthTokensFromQuery();
  if (legacy.accessToken) {
    console.warn(
      '[auth] Deprecated OAuth tokens in URL — deploy backend with oauth_code flow',
    );
    persistOAuthSessionTokens(legacy.accessToken);
    return legacy.accessToken;
  }

  return getSessionAccessToken();
}

/** Production flow: exchange oauth_code → /users/me → (fallback) /auth/refresh → /users/me. */
export async function restoreOAuthSession(setAuth) {
  clearFirstPageFeedCache();

  let queryAccess = null;
  try {
    queryAccess = await resolveOAuthAccessToken();
  } catch (exchangeErr) {
    console.error(
      '[auth] oauth exchange failed:',
      exchangeErr?.response?.data ?? exchangeErr?.message,
    );
    throw exchangeErr;
  }

  if (queryAccess) {
    setAuth({ token: queryAccess });
  }

  try {
    const user = await authApi.me({ force: true });
    const token = await ensureAccessTokenInStore(setAuth, user, queryAccess);
    if (!token) {
      throw new Error('Session restored without access token');
    }
    return user;
  } catch (meErr) {
    const refreshData = await authApi.refresh();
    const user = await authApi.me({ force: true });
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

export function readOAuthQueryError() {
  if (typeof window === 'undefined' || window.location.search.length <= 1) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('error') || params.get('error_code') || params.get('oauth_error') || null;
}