import { useEffect } from "react";
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
        toast.error("Не вдалося завантажити додаток. Спробуйте оновити сторінку.");
      } finally {
        setLoading(false);
      }
    })();
  }, [init, setLoading]);

  return null;
}