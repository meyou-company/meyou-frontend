import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.scss";
import "./index.css";
import "./styles/rtl.css";
import App from "./App.jsx";
import { initI18n } from "./i18n";
import { readStoredLocale } from "./i18n/config";
import {
  initClientMonitoring,
  registerGlobalErrorHandlers,
} from "./monitoring/sentry.js";
import { useThemeStore } from "./zustand/useThemeStore";

useThemeStore.getState().initTheme();
initI18n(readStoredLocale() ?? undefined);
initClientMonitoring();
registerGlobalErrorHandlers();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
