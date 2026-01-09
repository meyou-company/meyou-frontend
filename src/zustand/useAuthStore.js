import { create } from "zustand";
import { authApi } from "../services/auth";

export const useAuthStore = create((set) => ({
  user: null,
  isAuthLoading: false,
  isAuthed: false,

  init: async () => {
    set({ isAuthLoading: true });

    try {
      const user = await authApi.me();
      set({ user, isAuthed: true });
      return;
    } catch (e) {
      const status = e?.response?.status;

      // refresh робимо ТІЛЬКИ якщо 401
      if (status !== 401) {
        set({ user: null, isAuthed: false });
        throw e;
      }
    }

    // якщо були неавторизовані — пробуємо refresh
    try {
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

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, isAuthed: false });
    }
  },
}));