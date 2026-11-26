import fs from "node:fs";
import path from "node:path";

export const SENTRY_VITE_KEYS = [
  "VITE_SENTRY_ENABLED",
  "VITE_SENTRY_DSN",
  "VITE_SENTRY_ENVIRONMENT",
  "VITE_SENTRY_SAMPLE_RATE",
  "VITE_APP_RELEASE",
];

const INGEST_HOST_RE = /ingest(\.de)?\.sentry\.io/i;

/**
 * Build-time snapshot — boolean flags only, never secret values.
 */
export function snapshotSentryBuildEnv(env = process.env) {
  const enabledRaw = String(env.VITE_SENTRY_ENABLED ?? "").trim();
  const dsnRaw = String(env.VITE_SENTRY_DSN ?? "").trim();

  return {
    vercel: Boolean(env.VERCEL),
    ci: Boolean(env.CI),
    node_env: String(env.NODE_ENV ?? ""),
    enabled_key_present: env.VITE_SENTRY_ENABLED != null && enabledRaw !== "",
    enabled_exact_true: enabledRaw === "true",
    enabled_normalized_true: enabledRaw.toLowerCase() === "true",
    dsn_key_present: Boolean(dsnRaw),
    dsn_has_ingest_host: INGEST_HOST_RE.test(dsnRaw),
    environment_key_present: Boolean(
      String(env.VITE_SENTRY_ENVIRONMENT ?? "").trim(),
    ),
    sample_rate_key_present: Boolean(
      String(env.VITE_SENTRY_SAMPLE_RATE ?? "").trim(),
    ),
  };
}

/**
 * Ensure Vite production mode sees SENTRY vars via `.env.production.local`
 * (gitignored). Values are never logged.
 */
export function materializeSentryViteEnv(env = process.env) {
  const rows = [];
  for (const key of SENTRY_VITE_KEYS) {
    const value = env[key];
    if (value == null) continue;
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    rows.push(`${key}=${String(value).replace(/\r?\n/g, "")}`);
  }
  if (!rows.length) return false;

  const filePath = path.resolve(".env.production.local");
  let existing = "";
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, "utf8");
  }

  const otherLines = existing
    .split("\n")
    .filter(
      (line) =>
        line.trim() &&
        !SENTRY_VITE_KEYS.some(
          (k) => line.startsWith(`${k}=`) || line.startsWith(`${k} =`),
        ),
    );

  const body = [...otherLines, ...rows].filter(Boolean).join("\n");
  fs.writeFileSync(filePath, `${body}\n`, { mode: 0o600, encoding: "utf8" });
  return true;
}

export function scanDistBundles(distDir = "dist") {
  const assetsDir = path.join(distDir, "assets");
  if (!fs.existsSync(assetsDir)) {
    return {
      assets_dir_exists: false,
      main_bundle_found: false,
      ingest_host_embedded: false,
      ingest_de_host_embedded: false,
      bundle_file: null,
      bundle_bytes: 0,
    };
  }

  const jsFiles = fs
    .readdirSync(assetsDir)
    .filter((name) => name.startsWith("index-") && name.endsWith(".js"))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(assetsDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!jsFiles.length) {
    return {
      assets_dir_exists: true,
      main_bundle_found: false,
      ingest_host_embedded: false,
      ingest_de_host_embedded: false,
      bundle_file: null,
      bundle_bytes: 0,
    };
  }

  const bundleFile = jsFiles[0].name;
  const bundlePath = path.join(assetsDir, bundleFile);
  const source = fs.readFileSync(bundlePath, "utf8");

  return {
    assets_dir_exists: true,
    main_bundle_found: true,
    bundle_file: bundleFile,
    bundle_bytes: source.length,
    ingest_host_embedded: INGEST_HOST_RE.test(source),
    ingest_de_host_embedded: /ingest\.de\.sentry\.io/i.test(source),
    sentry_docs_string_present: source.includes("docs.sentry.io"),
  };
}

export function diagnosePostBuild(preSnapshot, distReport) {
  const expectedInit =
    preSnapshot.enabled_normalized_true && preSnapshot.dsn_has_ingest_host;

  return {
    expected_sentry_init_at_build:
      preSnapshot.enabled_exact_true && preSnapshot.dsn_key_present,
    expected_init_normalized:
      preSnapshot.enabled_normalized_true && preSnapshot.dsn_key_present,
    bundle_has_ingest_host: distReport.ingest_host_embedded,
    configuration_mismatch:
      expectedInit && !distReport.ingest_host_embedded,
    sdk_library_present_without_dsn:
      distReport.sentry_docs_string_present &&
      !distReport.ingest_host_embedded,
  };
}