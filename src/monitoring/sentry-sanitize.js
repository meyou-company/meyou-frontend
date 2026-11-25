/** Allowlisted Sentry tag keys (no PII). */
export const SENTRY_ALLOWED_TAG_KEYS = new Set([
  'release',
  'browser',
  'device_type',
  'api_status',
  'api_code',
  'http_method',
  'error_source',
]);

const CLIENT_APP_FIELDS = new Set(['release', 'browser', 'device_type']);

const ALLOWED_BROWSERS = new Set([
  'Edge',
  'Chrome',
  'Firefox',
  'Safari',
  'Opera',
  'unknown',
]);
const ALLOWED_DEVICE_TYPES = new Set(['tablet', 'mobile', 'desktop', 'unknown']);

const JWT_LIKE =
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

const BLOCKED_SUBSTRINGS = [
  'password',
  'refresh',
  'authorization',
  'cookie',
  'lunmeyo-device-id',
  'lunmeyo-session-id',
  'cloudinary',
  'signed',
  'bearer ',
];

const ALLOWED_EVENT_TOP_KEYS = new Set([
  'level',
  'platform',
  'timestamp',
  'environment',
  'release',
  'tags',
  'contexts',
  'exception',
  'message',
  'breadcrumbs',
]);

const ALLOWED_FIXED_MESSAGES = /^API \d{3}$/;

export function scrubFreeText(value) {
  if (typeof value !== 'string') return '';
  let out = value;
  out = out.replace(JWT_LIKE, '[redacted-jwt]');
  out = out.replace(BEARER, 'Bearer [redacted]');
  const lower = out.toLowerCase();
  for (const needle of BLOCKED_SUBSTRINGS) {
    if (lower.includes(needle)) return '[redacted]';
  }
  return out.slice(0, 500);
}

export function filterTags(tags) {
  if (!tags || typeof tags !== 'object') return undefined;
  const safe = {};
  for (const [key, value] of Object.entries(tags)) {
    if (!SENTRY_ALLOWED_TAG_KEYS.has(key)) continue;
    safe[key] = scrubFreeText(String(value)).slice(0, 120);
  }
  return Object.keys(safe).length ? safe : undefined;
}

function filterContexts(contexts) {
  if (!contexts || typeof contexts !== 'object') return undefined;
  const safe = {};
  for (const [key, ctx] of Object.entries(contexts)) {
    if (key !== 'app' || !ctx || typeof ctx !== 'object') continue;
    const filtered = {};
    for (const [field, val] of Object.entries(ctx)) {
      if (!CLIENT_APP_FIELDS.has(field)) continue;
      if (field === 'browser') {
        const browser = String(val).slice(0, 32);
        filtered.browser = ALLOWED_BROWSERS.has(browser) ? browser : 'unknown';
        continue;
      }
      if (field === 'device_type') {
        const device = String(val).slice(0, 32);
        filtered.device_type = ALLOWED_DEVICE_TYPES.has(device)
          ? device
          : 'unknown';
        continue;
      }
      if (field === 'release' && typeof val === 'string') {
        filtered.release = scrubFreeText(val).slice(0, 64) || 'dev';
      }
    }
    if (Object.keys(filtered).length) safe.app = filtered;
  }
  return Object.keys(safe).length ? safe : undefined;
}

export function sanitizeSentryEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const next = { ...event };
  delete next.request;
  delete next.user;
  delete next.extra;
  delete next.threads;
  delete next.modules;
  delete next.sdk;
  next.tags = filterTags(next.tags);
  next.contexts = filterContexts(next.contexts);
  return next;
}

/** Final allowlisted payload before Sentry transport. */
export function finalizeSentryPayload(event) {
  const base = sanitizeSentryEvent(event);
  if (!base) return null;

  const out = {};
  for (const key of ALLOWED_EVENT_TOP_KEYS) {
    if (!(key in base) || base[key] === undefined) continue;
    out[key] = base[key];
  }

  if (typeof out.message === 'string') {
    if (!ALLOWED_FIXED_MESSAGES.test(out.message)) {
      delete out.message;
    }
  }

  const exception = out.exception;
  if (exception?.values && Array.isArray(exception.values)) {
    out.exception = {
      values: exception.values.map((row) => ({
        type:
          typeof row?.type === 'string' && row.type.trim()
            ? row.type.trim().slice(0, 128)
            : 'Error',
      })),
    };
  }

  if (Array.isArray(base.breadcrumbs) && base.breadcrumbs.length) {
    out.breadcrumbs = base.breadcrumbs.slice(0, 15).map((b) => ({
      category:
        typeof b.category === 'string' && b.category.trim()
          ? b.category.trim().slice(0, 64)
          : 'app',
      level:
        typeof b.level === 'string' && b.level.trim()
          ? b.level.trim().slice(0, 16)
          : undefined,
    }));
  }

  out.tags = filterTags(out.tags);
  out.contexts = filterContexts(out.contexts);

  return out;
}

export function pathWithoutQuery(url) {
  if (typeof url !== 'string' || !url) return '/';
  const path = url.split('?')[0].split('#')[0];
  return path.slice(0, 200);
}