import test from "node:test";
import assert from "node:assert/strict";
import {
  diagnosePostBuild,
  snapshotSentryBuildEnv,
} from "./sentry-env-snapshot.mjs";

test("snapshotSentryBuildEnv never includes secret values", () => {
  const snap = snapshotSentryBuildEnv({
    VITE_SENTRY_ENABLED: "true",
    VITE_SENTRY_DSN: "https://a@o123.ingest.de.sentry.io/456",
    VITE_SENTRY_ENVIRONMENT: "production",
  });
  const json = JSON.stringify(snap);
  assert.equal(json.includes("https://"), false);
  assert.equal(json.includes("ingest.de"), false);
  assert.equal(snap.dsn_has_ingest_host, true);
  assert.equal(snap.enabled_exact_true, true);
});

test("diagnosePostBuild flags mismatch without throwing", () => {
  const pre = snapshotSentryBuildEnv({
    VITE_SENTRY_ENABLED: "true",
    VITE_SENTRY_DSN: "https://x@o1.ingest.de.sentry.io/1",
  });
  const dist = {
    ingest_host_embedded: false,
    sentry_docs_string_present: true,
  };
  const d = diagnosePostBuild(pre, dist);
  assert.equal(d.configuration_mismatch, true);
  assert.equal(d.sdk_library_present_without_dsn, true);
});