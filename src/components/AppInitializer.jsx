import { useEffect } from "react";
import { i18n } from "../i18n";
import { useAuthStore } from "../zustand/useAuthStore";
import { useGlobalLoader } from "../context/GlobalLoaderContext";
import { toast } from "sonner";

export default function AppInitializer() {
  const init = useAuthStore((s) => s.init);
  const { setLoading } = useGlobalLoader();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await init();
      } catch (e) {
        toast.error(i18n.t("common.appLoadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [init, setLoading]);

  return null;
}
