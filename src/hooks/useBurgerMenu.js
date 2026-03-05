import { useBurgerMenuStore } from "../zustand/useBurgerMenuStore";

/** Один глобальний стан — відкриття/закриття однаково на всіх сторінках */
export function useBurgerMenu() {
  const isOpen = useBurgerMenuStore((s) => s.isOpen);
  const open = useBurgerMenuStore((s) => s.open);
  const close = useBurgerMenuStore((s) => s.close);
  const toggle = useBurgerMenuStore((s) => s.toggle);
  return { isOpen, open, close, toggle };
}