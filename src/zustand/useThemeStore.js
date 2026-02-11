import { create } from "zustand";

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
};

export const useThemeStore = create((set, get) => ({
  theme: "dark", 

  initTheme: () => {
    const saved = localStorage.getItem("theme") || "dark"; 
    applyTheme(saved);
    set({ theme: saved });
  },

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));
