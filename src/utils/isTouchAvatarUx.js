import { useEffect, useState } from 'react';

const FINE_POINTER_HOVER = '(hover: hover) and (pointer: fine)';

export function isTouchAvatarUx() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return !window.matchMedia(FINE_POINTER_HOVER).matches;
}

export function useTouchAvatarUx() {
  const [touch, setTouch] = useState(() => isTouchAvatarUx());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(FINE_POINTER_HOVER);
    const sync = () => setTouch(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return touch;
}
