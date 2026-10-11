import { useEffect } from 'react';
import { useStoriesOverlayStore } from '../zustand/useStoriesOverlayStore';

export function useStoriesOverlayLock(isOpen) {
  const enter = useStoriesOverlayStore((s) => s.enter);
  const leave = useStoriesOverlayStore((s) => s.leave);

  useEffect(() => {
    if (!isOpen) return undefined;
    enter();
    return () => leave();
  }, [isOpen, enter, leave]);
}
