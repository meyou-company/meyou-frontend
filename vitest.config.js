import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { vitestExcludeFromJs } from "./scripts/ci-test-file-sets.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root,
  test: {
    environment: "jsdom",
    exclude: ["node_modules/**", "dist/**", ...vitestExcludeFromJs],
  },
});