import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.scss";
import "./index.css";
import App from "./App.jsx";
import { useThemeStore } from "./zustand/useThemeStore";

useThemeStore.getState().initTheme(); 

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
