import * as Sentry from '@sentry/react';
import { detectBrowserName, detectDeviceType, getAppRelease } from './device-context.js';
import { sanitizeSentryEvent } from './sentry-sanitize.js';

const EXPECTED_API_CODES = new Set([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
]);

const lastSentAt = new Map();
const DEDUPE_MS = 60_000;

let active = false;

export function isSentryEnabled() {
  if (import.meta.env.VITE_SENTRY_ENABLED !== 'true') return false;
  const dsn = String(import.meta.env.VITE_SENTRY_DSN ?? '').trim();
  return Boolean(dsn);
}

function parseSampleRate() {
  const raw = import.meta.env.VITE_SENTRY_SAMPLE_RATE;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

export function initClientMonitoring() {
  if (!isSentryEnabled() || active) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT ||
      import.meta.env.MODE ||
      'development',
    release: getAppRelease(),
    enabled: true,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 15,
    defaultIntegrations: false,
    integrations: [
      Sentry.inboundFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],
    beforeSend(event) {
      const status = event.tags?.api_status;
      const code = event.tags?.api_code;
      if (
        typeof status === 'string' &&
        ['401', '403', '404', '429'].includes(status)
      ) {
        return null;
      }
      if (typeof code === 'string' && EXPECTED_API_CODES.has(code)) {
        return null;
      }
      const fingerprint = `${event.exception?.values?.[0]?.type ?? 'msg'}:${event.message ?? ''}`;
      const now = Date.now();
      const prev = lastSentAt.get(fingerprint);
      if (prev && now - prev < DEDUPE_MS) return null;
      lastSentAt.set(fingerprint, now);
      return sanitizeSentryEvent(event);
    },
  });

  Sentry.setTag('browser', detectBrowserName());
  Sentry.setTag('device_type', detectDeviceType());
  Sentry.setTag('release', getAppRelease());
  Sentry.setContext('app', {
    release: getAppRelease(),
    browser: detectBrowserName(),
    device_type: detectDeviceType(),
  });

  active = true;
}

export function captureReactError(error, componentStack) {
  if (!isSentryEnabled()) return null;
  Sentry.withScope((scope) => {
    scope.setTag('error_source', 'react_boundary');
    if (componentStack) {
      scope.setContext('react', {
        component_stack: String(componentStack).slice(0, 300),
      });
    }
    Sentry.captureException(error);
  });
  return Sentry.lastEventId();
}

export function captureUnhandledError(error) {
  if (!isSentryEnabled()) return;
  if (error?.__sentryCaptured) return;
  error.__sentryCaptured = true;
  Sentry.withScope((scope) => {
    scope.setTag('error_source', 'global');
    Sentry.captureException(error);
  });
}

export function captureApiServerError(meta) {
  if (!isSentryEnabled()) return;
  const { status, code, method, urlPath } = meta;
  if (!status || status < 500) return;
  const key = `${status}:${code}:${method}:${urlPath}`;
  const now = Date.now();
  const prev = lastSentAt.get(key);
  if (prev && now - prev < DEDUPE_MS) return;
  lastSentAt.set(key, now);

  Sentry.withScope((scope) => {
    scope.setTag('error_source', 'api');
    scope.setTag('api_status', String(status));
    if (code) scope.setTag('api_code', String(code).slice(0, 64));
    if (method) scope.setTag('http_method', method.slice(0, 8));
    Sentry.captureMessage(`API ${status}`, 'error');
  });
}

export function registerGlobalErrorHandlers() {
  if (!isSentryEnabled()) return;
  window.addEventListener('error', (event) => {
    if (event.error) captureUnhandledError(event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      captureUnhandledError(reason);
    } else if (reason != null) {
      captureUnhandledError(new Error(String(reason).slice(0, 200)));
    }
  });
}

export { Sentry, parseSampleRate };