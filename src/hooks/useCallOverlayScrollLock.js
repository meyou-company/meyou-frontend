import { useEffect } from 'react';

let locks = 0;
let restore;

export function useCallOverlayScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      const elements = [document.documentElement, document.body];
      const saved = elements.map(element => ({
        element,
        overflow: element.style.getPropertyValue('overflow'),
        overflowPriority: element.style.getPropertyPriority('overflow'),
        overscroll: element.style.getPropertyValue('overscroll-behavior'),
        overscrollPriority: element.style.getPropertyPriority('overscroll-behavior'),
      }));
      elements.forEach(element => {
        element.style.setProperty('overflow', 'hidden', 'important');
        element.style.setProperty('overscroll-behavior', 'none');
      });
      restore = () => saved.forEach(({element, overflow, overflowPriority, overscroll, overscrollPriority}) => {
        if (overflow) element.style.setProperty('overflow', overflow, overflowPriority);
        else element.style.removeProperty('overflow');
        if (overscroll) element.style.setProperty('overscroll-behavior', overscroll, overscrollPriority);
        else element.style.removeProperty('overscroll-behavior');
      });
    }
    return () => { if (--locks === 0) { restore?.(); restore = null; } };
  }, [active]);
}
