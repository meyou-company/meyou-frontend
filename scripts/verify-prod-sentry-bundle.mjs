#!/usr/bin/env node
/**
 * Production bundle verification (no secrets sent to stdout).
 * Usage:
 *   node scripts/verify-prod-sentry-bundle.mjs
 *   node scripts/verify-prod-sentry-bundle.mjs ./path/to/index-*.js
 *   SENTRY_BUNDLE_URL=https://lunmeyo.com/assets/index-xxxxx.js node scripts/verify-prod-sentry-bundle.mjs
 */
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const EU_HOST = /ingest\.(?:de\.)?sentry\.io/i;

async function loadBundleSource(arg) {
  if (process.env.SENTRY_BUNDLE_URL) {
    const res = await fetch(process.env.SENTRY_BUNDLE_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LUNMEYO-SentryVerify/1.0; +https://lunmeyo.com)",
      },
    });
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }
  if (arg && arg !== "--") {
    return readFile(path.resolve(arg), "utf8");
  }
  const res = await fetch("https://lunmeyo.com/", {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; LUNMEYO-SentryVerify/1.0; +https://lunmeyo.com)",
    },
  });
  if (!res.ok) throw new Error(`homepage fetch failed: ${res.status}`);
  const html = await res.text();
  const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  if (!m) throw new Error("index bundle path not found in HTML");
  const bundleUrl = new URL(m[0], "https://lunmeyo.com").toString();
  const js = await fetch(bundleUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; LUNMEYO-SentryVerify/1.0; +https://lunmeyo.com)",
    },
  });
  if (!js.ok) throw new Error(`bundle fetch failed: ${js.status}`);
  return js.text();
}

function analyze(bundle) {
  const hasEu = EU_HOST.test(bundle);
  const hasSentrySdk = bundle.includes("@sentry") || bundle.includes("ingest");
  const gatedOff =
    bundle.includes('import.meta.env.VITE_SENTRY_ENABLED') ||
    (bundle.includes("VITE_SENTRY_ENABLED") && bundle.includes('!=="true"'));

  return {
    sentryLikelyEnabledInBundle: hasEu,
    hasSentrySdkStrings: hasSentrySdk,
    buildStillContainsDisabledGate: gatedOff,
    bundleBytes: bundle.length,
  };
}

try {
  const arg = process.argv[2];
  const bundle = await loadBundleSource(arg);
  const report = analyze(bundle);
  console.log(JSON.stringify({ ok: true, ...report }, null, 2));
  if (!report.sentryLikelyEnabledInBundle) {
    console.error(
      "DIAGNOSIS: DSN/EU ingest host absent — Vite build did not embed VITE_SENTRY_* (env scope, names, or redeploy).",
    );
    process.exit(2);
  }
} catch (err) {
  console.log(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      manual:
        "Download assets/index-*.js from DevTools → Sources; run: node scripts/verify-prod-sentry-bundle.mjs ./index-xxxxx.js",
    }),
  );
  process.exit(1);
}