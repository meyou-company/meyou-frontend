import { useThemeStore } from "../../zustand/useThemeStore";
import "./ThemeToggle.scss";

export default function ThemeToggleDark({ className = "" }) {
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`theme-toggle ${effectiveTheme} ${className}`}
    >
      <span className="icon">
        {effectiveTheme === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
