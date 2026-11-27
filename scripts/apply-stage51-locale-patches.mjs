#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'src/i18n/locales');
const patchPath = join(root, 'scripts/stage51-locale-patches.json');

function deepMerge(target, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch;
  }
  const out = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const patches = JSON.parse(readFileSync(patchPath, 'utf8'));
for (const [locale, patch] of Object.entries(patches)) {
  const file = join(localesDir, `${locale}.json`);
  const current = JSON.parse(readFileSync(file, 'utf8'));
  const merged = deepMerge(current, patch);
  writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`merged stage51 patch -> ${locale}.json`);
}