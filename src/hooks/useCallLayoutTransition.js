import { useLayoutEffect, useRef } from 'react';

export function useCallLayoutTransition(stageRef, layoutKey) {
  const previous = useRef(new Map());
  useLayoutEffect(() => {
    const snapshots = new Map();
    const animations = [];
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    stageRef.current?.querySelectorAll('[data-call-tile]').forEach(element => {
      const id = element.dataset.callTile;
      const bounds = element.getBoundingClientRect();
      const old = previous.current.get(id);
      snapshots.set(id, bounds);
      if (reducedMotion || !old?.width || !old?.height || !bounds.width || !bounds.height || !element.animate) return;
      // Individual transforms leave the local camera's scaleX(-1) mirroring intact.
      const x = old.x - bounds.x + (old.width - bounds.width) / 2;
      const y = old.y - bounds.y + (old.height - bounds.height) / 2;
      animations.push(element.animate([
        { translate: `${x}px ${y}px`, scale: `${old.width / bounds.width} ${old.height / bounds.height}` },
        { translate: '0px 0px', scale: '1 1' },
      ], { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' }));
    });
    previous.current = snapshots;
    return () => animations.forEach(animation => animation.cancel());
  }, [stageRef, layoutKey]);
}
