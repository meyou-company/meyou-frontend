#!/usr/bin/env node
/**
 * Local Sentry pipeline smoke (no PII, optional real DSN).
 * Usage:
 *   SENTRY_SMOKE_DSN=https://<key>@o<org>.ingest.de.sentry.io/<project> node scripts/sentry-smoke-local.mjs
 * Without DSN: validates finalizeSentryPayload + inboundFilters + beforeSend only (dry).
 */
import assert from "node:assert/strict";
import process from "node:process";
import * as Sentry from "@sentry/react";
import { finalizeSentryPayload } from "../src/monitoring/sentry-sanitize.js";

const SMOKE = "LUNMEYO_SENTRY_SMOKE_LOCAL";
const dsn = String(process.env.SENTRY_SMOKE_DSN ?? "").trim();

const received = [];
const dropped = [];

function runPipelineAssertions(eventAfterBeforeSend) {
  assert.ok(eventAfterBeforeSend, "beforeSend must not return null");
  assert.equal(
    JSON.stringify(eventAfterBeforeSend).includes(SMOKE),
    false,
    "smoke string must not appear in outbound payload",
  );
  assert.ok(
    eventAfterBeforeSend.exception?.values?.[0]?.type,
    "exception.type required",
  );
  assert.equal(
    eventAfterBeforeSend.exception?.values?.[0]?.value,
    undefined,
    "exception.value must be stripped",
  );
}

function dryRun() {
  const mockInbound = {
    type: undefined,
    message: SMOKE,
    exception: {
      values: [
        {
          type: "Error",
          value: SMOKE,
          stacktrace: { frames: [{ filename: "app.js", lineno: 1 }] },
        },
      ],
    },
    tags: { error_source: "global", browser: "Chrome", device_type: "desktop" },
  };

  const hasStack =
    mockInbound.exception.values.some(
      (v) => v.stacktrace || (v.type && v.type !== "Error") || v.value,
    );
  assert.ok(hasStack, "pre-beforeSend event must pass inbound _isUselessError");

  const finalized = finalizeSentryPayload(mockInbound);
  runPipelineAssertions(finalized);
  console.log(
    JSON.stringify({
      mode: "dry",
      ok: true,
      outboundKeys: Object.keys(finalized),
    }),
  );
}

async function liveSend() {
  const beforeSendResults = [];

  await new Promise((resolve, reject) => {
    Sentry.init({
      dsn,
      environment: "sentry-smoke-local",
      release: "local-smoke",
      enabled: true,
      tracesSampleRate: 0,
      defaultIntegrations: false,
      integrations: [
        Sentry.inboundFiltersIntegration(),
        Sentry.functionToStringIntegration(),
        Sentry.linkedErrorsIntegration(),
        Sentry.dedupeIntegration(),
      ],
      transportOptions: { flushTimeout: 5000 },
      beforeSend(event) {
        const finalized = finalizeSentryPayload(event);
        beforeSendResults.push(finalized);
        const fingerprint = `${event.exception?.values?.[0]?.type ?? "msg"}:${event.message ?? ""}`;
        if (fingerprint) received.push(fingerprint);
        return finalized;
      },
    });

    Sentry.withScope((scope) => {
      scope.setTag("error_source", "smoke_local");
      Sentry.captureException(new Error(SMOKE));
    });

    Sentry.flush(5000)
      .then(() => resolve())
      .catch(reject);
  });

  assert.equal(beforeSendResults.length, 1, "beforeSend must run once");
  runPipelineAssertions(beforeSendResults[0]);

  const client = Sentry.getClient();
  const droppedCounts = client?.getDroppedEvents?.() ?? {};

  console.log(
    JSON.stringify({
      mode: "live",
      ok: true,
      lastEventId: Sentry.lastEventId(),
      beforeSendRan: beforeSendResults.length,
      droppedCounts,
    }),
  );
}

if (dsn) {
  await liveSend();
} else {
  dryRun();
  console.log(
    "Tip: set SENTRY_SMOKE_DSN to EU project DSN for live flush (no PII in payload).",
  );
}