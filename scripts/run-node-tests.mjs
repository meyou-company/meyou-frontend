#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  nodeScriptTestFiles,
  nodeTestRunnerFiles,
} from "./ci-test-file-sets.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

if (!nodeTestRunnerFiles.length && !nodeScriptTestFiles.length) {
  console.log("No Node-native test files.");
  process.exit(0);
}

if (nodeTestRunnerFiles.length) {
  const result = spawnSync(process.execPath, ["--test", ...nodeTestRunnerFiles], {
    stdio: "inherit",
    cwd: root,
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

for (const file of nodeScriptTestFiles) {
  const result = spawnSync(process.execPath, [file], {
    stdio: "inherit",
    cwd: root,
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}