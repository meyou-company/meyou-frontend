import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalLoader } from "../context/GlobalLoaderContext";

export default function RouterLoaderSync() {
  const location = useLocation();
  const { setLoading } = useGlobalLoader();

  useEffect(() => {
    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return null;
}