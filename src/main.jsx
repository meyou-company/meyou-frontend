import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.scss";
import "./index.css";
import "./styles/rtl.css";
import App from "./App.jsx";
import { initI18n } from "./i18n";
import { readStoredLocale, detectBrowserLocale } from "./i18n/config";
import { useThemeStore } from "./zustand/useThemeStore";

useThemeStore.getState().initTheme();
initI18n(readStoredLocale() || detectBrowserLocale());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
