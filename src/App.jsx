import { useEffect } from "react";
import { useAuthStore } from "./zustand/useAuthStore";
import AppRouter from "./router/AppRouter";

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    (async () => {
      try {
        await init();
        console.log("APP init done");
      } catch (e) {
        console.error("APP init crash:", e);
      }
    })();
  }, [init]);

  return <AppRouter />;
}
