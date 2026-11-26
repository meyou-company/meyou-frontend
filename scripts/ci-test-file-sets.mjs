import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

export function walkTestJsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkTestJsFiles(path, out);
      continue;
    }
    if (!name.endsWith(".test.js")) continue;
    out.push(path);
  }
  return out;
}

/**
 * @param {string} src
 */
function usesVitest(src) {
  return /from\s+['"]vitest['"]/.test(src);
}

/**
 * @param {string} src
 */
function usesNodeTest(src) {
  return /from\s+['"]node:test['"]/.test(src);
}

const all = walkTestJsFiles(join(root, "src"));

export const vitestExcludeFromJs = [];
export const nodeTestRunnerFiles = [];
export const nodeScriptTestFiles = [];

for (const file of all) {
  const src = readFileSync(file, "utf8");
  if (usesVitest(src)) continue;
  vitestExcludeFromJs.push(file.replaceAll("\\", "/"));
  if (usesNodeTest(src)) {
    nodeTestRunnerFiles.push(file);
  } else {
    nodeScriptTestFiles.push(file);
  }
}
