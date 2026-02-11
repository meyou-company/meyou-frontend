import { useEffect } from "react";
import { useThemeStore } from "../zustand/useThemeStore";

export function useForceLightTheme() {
  const setTheme = useThemeStore.getState().setTheme;
  const prevTheme = useThemeStore.getState().theme;

  useEffect(() => {
    setTheme("light");
    return () => {
      setTheme(prevTheme || "dark");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
