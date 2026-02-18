
import { create } from "zustand";

/** 19:00–5:59 = dark, 6:00–18:59 = light */
const getEffectiveFromTime = () => {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6 ? "dark" : "light";
};

const applyTheme = (effective) => {
  document.documentElement.setAttribute("data-theme", effective);
  if (effective === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
};

export const useThemeStore = create((set, get) => ({
  theme: "auto", // "light" | "dark" | "auto"
  effectiveTheme: "light",

  getEffectiveTheme: () => {
    const { theme } = get();
    return theme === "auto" ? getEffectiveFromTime() : theme;
  },

  initTheme: () => {
    let saved = localStorage.getItem("theme");
    const userChose = localStorage.getItem("themeUserChose");
    if (!saved) saved = "auto";
    else if (saved === "light" && !userChose) saved = "auto";
    if (saved === "auto") localStorage.setItem("theme", "auto");
    set({ theme: saved });

    const update = () => {
      const { theme } = get();
      const effective = theme === "auto" ? getEffectiveFromTime() : theme;
      applyTheme(effective);
      set({ effectiveTheme: effective });
    };

    update();
    setInterval(update, 60 * 1000);
  },

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("themeUserChose", "1");
    const effective = theme === "auto" ? getEffectiveFromTime() : theme;
    applyTheme(effective);
    set({ theme, effectiveTheme: effective });
  },

  toggleTheme: () => {
    const { theme, getEffectiveTheme } = get();
    if (theme === "auto") {
      const next = getEffectiveTheme() === "dark" ? "light" : "dark";
      get().setTheme(next);
    } else {
      const next = theme === "dark" ? "light" : "dark";
      get().setTheme(next);
    }
  },
}));
