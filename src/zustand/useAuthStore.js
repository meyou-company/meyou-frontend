import { create } from "zustand";
import { authApi } from "../services/auth";
import { passwordApi } from "../services/passwordApi";

export const useAuthStore = create((set) => ({
  user: null,
  isAuthLoading: false,
  isAuthed: false,

  // ✅ допоміжне: локально оновити user частково (без запитів)
  setUserPatch: (patch) =>
    set((s) => ({
      user: s.user ? { ...s.user, ...patch } : s.user,
    })),

  // ✅ якщо треба повністю замінити user
  setUser: (user) => set({ user, isAuthed: Boolean(user) }),

  init: async () => {
    set({ isAuthLoading: true });

    try {
      try {
        const user = await authApi.me();
        set({ user, isAuthed: true });
        return;
      } catch (e) {
        const status = e?.response?.status;
        console.log("[init] me() failed:", status, e?.message);
        if (status !== 401) throw e;
      }

      // якщо me() 401 → пробуємо refresh → me()
      console.log("[init] Trying refresh...");
      await authApi.refresh();
      console.log("[init] refresh() success");
      const user = await authApi.me();
      set({ user, isAuthed: true });
    } catch (err) {
      console.log("[init] refresh failed, logging out:", err?.response?.status, err?.message);
      set({ user: null, isAuthed: false });
    } finally {
      set({ isAuthLoading: false });
    }
  },

  login: async (payload) => {
    set({ isAuthLoading: true });
    try {
      await authApi.login(payload);
      const user = await authApi.me();
      set({ user, isAuthed: true });
      return { ok: true };
    } catch (e) {
      set({ user: null, isAuthed: false });
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  register: async (payload) => {
    set({ isAuthLoading: true });
    try {
      await authApi.register(payload);
      const user = await authApi.me();
      set({ user, isAuthed: true });
      return { ok: true };
    } catch (e) {
      set({ user: null, isAuthed: false });
      return { ok: false, error: e };
    } finally {
      set({ isAuthLoading: false });
    }
  },

  verifyEmailCode: async ({ code }) => {
    set({ isAuthLoading: true });
    try {
      await authApi.verifyEmail(code);
      const user = await authApi.me();
      set({ user, isAuthed: true });
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

  // ✅ БЕЗПЕЧНИЙ refreshMe: не ламає навігацію, пробує refresh при 401
  refreshMe: async () => {
    try {
      const user = await authApi.me();
      set({ user, isAuthed: true });
      return user;
    } catch (e) {
      const status = e?.response?.status;

      // якщо 401 → пробуємо refresh → me()
      if (status === 401) {
        try {
          await authApi.refresh();
          const user = await authApi.me();
          set({ user, isAuthed: true });
          return user;
        } catch (e2) {
          // якщо refresh теж 401 → розлогін
          set({ user: null, isAuthed: false });
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
      set({ user: null, isAuthed: false });
    }
  },
}));
