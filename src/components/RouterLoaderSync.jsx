import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalLoader } from "../context/GlobalLoaderContext";

export default function RouterLoaderSync() {
  const location = useLocation();
  const { setLoading } = useGlobalLoader();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const nextPath = location.pathname;
    previousPathRef.current = nextPath;

    const isInternalLiveTransition =
      previousPath.startsWith("/live") && nextPath.startsWith("/live");

    if (isInternalLiveTransition) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return null;
}
