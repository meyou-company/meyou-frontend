import { create } from 'zustand';
import {
  AUTH_SESSION_CLEARED_EVENT,
  clearOAuthSessionTokens,
  clearSessionAccessToken,
  getSessionAccessToken,
  persistOAuthSessionTokens,
} from '../services/api';
import { authApi } from '../services/auth';
import {
  applyAuthFromSession,
  ensureAccessTokenInStore,
  pickAccessToken,
} from '../services/authSession';
import { passwordApi } from '../services/passwordApi';
import { disconnectSocket } from '../services/socket';
import { useMessagesStore } from './useMessagesStore';
import { useNotificationsStore } from './useNotificationsStore';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const OAUTH_CALLBACK_PATHS = new Set(['/auth/google/success', '/auth/callback']);

function isOAuthCallbackPath() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return OAUTH_CALLBACK_PATHS.has(path);
}

function clearAuthSession(set) {
  disconnectSocket();
  clearOAuthSessionTokens();
  useMessagesStore.getState().reset();
  set({ user: null, token: null, isAuthed: false });
}

async function loadMeWithRetry(retries = 2, delayMs = 200) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await authApi.me();
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;
      if (status !== 401 || attempt === retries) break;
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthLoading: true,
  isAuthed: false,

  setUserPatch: (patch) =>
    set((s) => ({
      user: s.user ? { ...s.user, ...patch } : s.user,
    })),

  setUser: (user) =>
    set((state) => {
      const token = state.token ?? getSessionAccessToken();
      return {
        user,
        token,
        isAuthed: Boolean(user && token),
      };
    }),

  setToken: (token) => set({ token }),

  clearSession: () => clearAuthSession(set),

  init: async () => {
    set({ isAuthLoading: true });

    if (isOAuthCallbackPath()) {
      set({ isAuthLoading: false });
      return;
    }

    try {
      try {
        const user = await authApi.me();
        const token = await ensureAccessTokenInStore(
          set,
          user,
          getSessionAccessToken(),
        );
        if (token) {
          await Promise.all([
            useNotificationsStore.getState().fetchUnreadCount(),
            useMessagesStore.getState().fetchTotalUnreadCount(),
          ]);
          return;
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401) {
          clearSessionAccessToken();
          set({ token: null });
        } else {
          throw e;
        }
      }

      const refreshData = await authApi.refresh();
      const user = await authApi.me();
      const token = await ensureAccessTokenInStore(
        set,
        user,
        pickAccessToken(refreshData) ?? getSessionAccessToken(),
      );
      if (!token) {
        throw new Error('init: session restored without access token');
      }
      await Promise.all([
        useNotificationsStore.getState().fetchUnreadCount(),
        useMessagesStore.getState().fetchTotalUnreadCount(),
      ]);
    } catch (err) {
      console.log(
        '[init] session restore failed:',
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
      clearAuthSession(set);
    } finally {
      set({ isAuthLoading: false });
    }
  },

  login: async (payload) => {
    set({ isAuthLoading: true });
    try {
      const res = await authApi.login(payload);
      const user = await loadMeWithRetry(3, 250);
      const accessToken = pickAccessToken(res);
      persistOAuthSessionTokens(accessToken, res?.refreshToken ?? res?.refresh_token);
      set({ user, token: accessToken, isAuthed: true });
      return { ok: true };
    } catch (e) {
      console.error('[login] failed:', e?.response?.data ?? e?.message);
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  register: async (payload) => {
    set({ isAuthLoading: true });
    try {
      await authApi.register(payload);
      clearAuthSession(set);
      return { ok: true, requiresEmailVerification: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  verifyEmailCode: async ({ code }) => {
    set({ isAuthLoading: true });
    try {
      await authApi.verifyEmail(code);
      const user = await loadMeWithRetry(3, 250);
      await ensureAccessTokenInStore(set, user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  resendEmailCode: async () => {
    set({ isAuthLoading: true });
    try {
      await authApi.resendEmailCode();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  verifyResetCode: async ({ email, code }) => {
    set({ isAuthLoading: true });
    try {
      await passwordApi.verifyResetCode({ email, code });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  resetPassword: async ({ email, code, newPassword }) => {
    set({ isAuthLoading: true });
    try {
      await passwordApi.resetPassword({ email, code, newPassword });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  forgotPassword: async (email) => {
    set({ isAuthLoading: true });
    try {
      await passwordApi.forgotPassword(email);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  refreshMe: async () => {
    try {
      const user = await authApi.me();
      const token = await ensureAccessTokenInStore(
        set,
        user,
        getSessionAccessToken(),
      );
      if (token) return user;
      throw Object.assign(new Error('refreshMe: missing access token'), {
        response: { status: 401 },
      });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        clearSessionAccessToken();
        try {
          const refreshData = await authApi.refresh();
          const user = await authApi.me();
          const token = await ensureAccessTokenInStore(
            set,
            user,
            pickAccessToken(refreshData) ?? getSessionAccessToken(),
          );
          if (!token) {
            clearAuthSession(set);
            throw new Error('refreshMe: refresh succeeded without access token');
          }
          return user;
        } catch (e2) {
          clearAuthSession(set);
          throw e2;
        }
      }
      throw e;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuthSession(set);
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_SESSION_CLEARED_EVENT, () => {
    useAuthStore.getState().clearSession();
  });

  window.addEventListener('meyou:oauth-access-token', (event) => {
    const accessToken = event?.detail?.accessToken;
    if (!accessToken) return;
    const state = useAuthStore.getState();
    if (state.token === accessToken) return;
    useAuthStore.setState({ token: accessToken });
  });
}
