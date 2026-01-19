import { useEffect } from "react";
import { useThemeStore } from "../zustand/useThemeStore";

export function useForceDarkTheme() {
  const setTheme = useThemeStore((s) => s.setTheme);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const prev = theme;        // запам’ятали стан стора
    setTheme("dark");          // ✅ форсимо через store

    return () => {
      setTheme(prev || "dark"); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
