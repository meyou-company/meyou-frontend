#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  diagnosePostBuild,
  materializeSentryViteEnv,
  scanDistBundles,
  snapshotSentryBuildEnv,
} from "./sentry-env-snapshot.mjs";

const PRE_SNAPSHOT_PATH = path.resolve(".sentry-build-pre.json");

function logDiagnostic(payload) {
  console.log(`[sentry-build-diag] ${JSON.stringify(payload)}`);
}

function runPre() {
  const snapshot = snapshotSentryBuildEnv();
  const materialized = materializeSentryViteEnv();

  const payload = {
    phase: "pre",
    snapshot,
    materialized_production_local: materialized,
    materialized_path: materialized ? ".env.production.local" : null,
  };

  fs.writeFileSync(PRE_SNAPSHOT_PATH, JSON.stringify(payload), "utf8");
  logDiagnostic(payload);

  if (
    snapshot.enabled_key_present &&
    !snapshot.enabled_exact_true &&
    snapshot.enabled_normalized_true
  ) {
    logDiagnostic({
      phase: "pre",
      level: "warn",
      code: "SENTRY_ENABLED_NOT_EXACT_TRUE",
      message:
        "VITE_SENTRY_ENABLED is set but not exactly 'true' (case/whitespace). Runtime uses normalized check.",
    });
  }

  if (snapshot.enabled_exact_true && snapshot.dsn_key_present && !snapshot.dsn_has_ingest_host) {
    logDiagnostic({
      phase: "pre",
      level: "warn",
      code: "DSN_HOST_UNEXPECTED",
      message:
        "VITE_SENTRY_DSN is set but ingest host pattern was not detected (EU/US host check only, no secrets logged).",
    });
  }
}

function runPost() {
  const dist = scanDistBundles("dist");
  let pre = { snapshot: snapshotSentryBuildEnv() };

  if (fs.existsSync(PRE_SNAPSHOT_PATH)) {
    try {
      pre = JSON.parse(fs.readFileSync(PRE_SNAPSHOT_PATH, "utf8"));
    } catch {
      pre = { snapshot: snapshotSentryBuildEnv() };
    }
  }

  const diagnosis = diagnosePostBuild(pre.snapshot, dist);

  const payload = {
    phase: "post",
    dist,
    diagnosis,
    pre_snapshot: pre.snapshot,
  };

  logDiagnostic(payload);

  if (diagnosis.configuration_mismatch) {
    logDiagnostic({
      phase: "post",
      level: "error",
      code: "BUILD_ENV_BUNDLE_MISMATCH",
      message:
        "Sentry env indicated enabled+DSN at build start, but main bundle has no ingest host. Check Vercel project linkage and Production env scope.",
    });
  }

  if (diagnosis.sdk_library_present_without_dsn) {
    logDiagnostic({
      phase: "post",
      level: "warn",
      code: "SDK_WITHOUT_DSN",
      message:
        "@sentry/react is bundled but DSN host not embedded — initClientMonitoring() was tree-shaken (Sentry disabled at build time).",
    });
  }

  try {
    fs.unlinkSync(PRE_SNAPSHOT_PATH);
  } catch {
    /* ignore */
  }
}

const phase = process.argv[2] ?? "pre";
if (phase === "pre") {
  runPre();
} else if (phase === "post") {
  runPost();
} else {
  console.error("Usage: node scripts/sentry-build.mjs <pre|post>");
}