import { useEffect, useRef } from 'react';

export function useInfiniteScroll(callback, enabled = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold: 0.2 }
    );

    const el = ref.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [callback, enabled]);

  return ref;
}
