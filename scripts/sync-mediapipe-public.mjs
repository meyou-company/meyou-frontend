/**
 * Copy @mediapipe/tasks-vision WASM loaders from node_modules into public/mediapipe/.
 * JS runtime is bundled into the face-tracker worker via npm; WASM stays on the same origin.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'package.json');
const wasmSrc = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = path.join(root, 'public', 'mediapipe');

const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

if (!existsSync(pkgPath)) {
  console.warn('[sync-mediapipe-public] @mediapipe/tasks-vision not installed; skipping.');
  process.exit(0);
}

const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
if (version !== '0.10.32') {
  console.error(`[sync-mediapipe-public] Expected tasks-vision 0.10.32, got ${version}.`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
for (const name of WASM_FILES) {
  const from = path.join(wasmSrc, name);
  if (!existsSync(from)) {
    console.error(`[sync-mediapipe-public] Missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, path.join(dest, name));
}

console.log(`[sync-mediapipe-public] Synced ${WASM_FILES.length} files (tasks-vision@${version}).`);