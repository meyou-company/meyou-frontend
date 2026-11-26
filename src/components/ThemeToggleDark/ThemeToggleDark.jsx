import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../zustand/useThemeStore";
import "./ThemeToggle.scss";

export default function ThemeToggleDark({ className = "" }) {
  const { t } = useTranslation();
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t("uiText.toggle_theme")}
      className={`theme-toggle ${effectiveTheme} ${className}`}
    >
      <span className="icon">
        {effectiveTheme === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
