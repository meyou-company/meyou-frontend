import { create } from "zustand";

/** Глобальний стан бургер-меню — один екземпляр на всіх сторінках */
export const useBurgerMenuStore = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
