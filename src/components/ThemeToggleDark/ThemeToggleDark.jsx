import { useThemeStore } from "../../zustand/useThemeStore";
import "./ThemeToggle.scss";

export default function ThemeToggleDark({ className = "" }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`theme-toggle ${theme} ${className}`}
    >
      <span className="icon">
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
