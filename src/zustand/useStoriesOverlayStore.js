import { create } from 'zustand';
import { useBurgerMenuStore } from './useBurgerMenuStore';

const BODY_CLASS = 'stories-overlay-active';

function syncBodyClass(isActive) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle(BODY_CLASS, isActive);
}

/**
 * Nested Story viewer + upload both call enter/leave.
 * Site chrome hides while count > 0 and restores after the last overlay closes.
 */
export const useStoriesOverlayStore = create((set, get) => ({
  count: 0,
  isActive: false,
  enter: () => {
    useBurgerMenuStore.getState().close();
    const count = get().count + 1;
    const isActive = count > 0;
    set({ count, isActive });
    syncBodyClass(isActive);
  },
  leave: () => {
    const count = Math.max(0, get().count - 1);
    const isActive = count > 0;
    set({ count, isActive });
    syncBodyClass(isActive);
  },
}));
