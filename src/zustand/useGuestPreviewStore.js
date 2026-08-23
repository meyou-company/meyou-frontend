import { create } from 'zustand';

/**
 * Frontend-only "view my profile as a stranger" mode.
 * Does not change auth — only how /profile renders for the owner.
 */
export const useGuestPreviewStore = create((set, get) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled: Boolean(enabled) }),
  toggle: () => set({ enabled: !get().enabled }),
}));
