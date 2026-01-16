
import { create } from "zustand";
import { authApi } from "../services/auth";
import { passwordApi } from "../services/passwordApi";

export const useAuthStore = create((set) => ({
  user: null,
  isAuthLoading: false,
  isAuthed: false,

  init: async () => {
    set({ isAuthLoading: true });

    try {
      try {
        const user = await authApi.me();
        set({ user, isAuthed: true });
        return;
      } catch (e) {
        const status = e?.response?.status;
        if (status !== 401) throw e;
      }

      await authApi.refresh();
      const user = await authApi.me();
      set({ user, isAuthed: true });
    } catch {
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
    // ВАЖЛИВО: передаємо РЯДОК, не обʼєкт
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

  refreshMe: async () => {
    const user = await authApi.me();
    set({ user, isAuthed: true });
    return user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, isAuthed: false });
    }
  },
}));
