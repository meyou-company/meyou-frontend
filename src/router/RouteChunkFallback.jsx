import { useEffect } from 'react';
import { useGlobalLoader } from '../context/GlobalLoaderContext';

/** Suspense fallback: reuse global loader (no layout change). */
export default function RouteChunkFallback() {
  const { setLoading } = useGlobalLoader();

  useEffect(() => {
    setLoading(true);
    return () => setLoading(false);
  }, [setLoading]);

  return null;
}