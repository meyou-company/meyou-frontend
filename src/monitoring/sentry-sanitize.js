/** Allowlisted Sentry tag keys (no PII). */
export const SENTRY_ALLOWED_TAG_KEYS = new Set([
  'release',
  'browser',
  'device_type',
  'api_status',
  'api_code',
  'http_method',
]);

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

export function sanitizeSentryEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const next = { ...event };
  delete next.request;
  delete next.user;
  delete next.extra;
  if (Array.isArray(next.breadcrumbs)) {
    next.breadcrumbs = next.breadcrumbs.map((b) => ({
      category: typeof b.category === 'string' ? b.category.slice(0, 64) : 'app',
      level: b.level,
      message:
        typeof b.message === 'string' ? scrubFreeText(b.message) : undefined,
    }));
  }
  if (typeof next.message === 'string') {
    next.message = scrubFreeText(next.message);
  }
  next.tags = filterTags(next.tags);
  return next;
}

export function pathWithoutQuery(url) {
  if (typeof url !== 'string' || !url) return '/';
  const path = url.split('?')[0].split('#')[0];
  return path.slice(0, 200);
}