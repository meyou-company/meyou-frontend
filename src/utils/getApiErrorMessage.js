import { i18n } from '../i18n';

/**
 * User-facing error text from axios response.
 * Prefers stable `code` from API for i18n; falls back to server message or generic.
 */
export function getApiErrorMessage(error, fallbackKey = 'errors.generic') {
  if (!error) {
    return i18n.t(fallbackKey);
  }

  const data = error.response?.data;
  const code = data?.code;

  if (typeof code === 'string' && code.trim()) {
    const key = `errors.${code.trim()}`;
    if (i18n.exists(key)) {
      return i18n.t(key);
    }
  }

  if (typeof data === 'string' && data.trim()) return data.trim();

  const m = data?.message;

  if (Array.isArray(m)) {
    const firstStr = m.find((x) => typeof x === 'string' && x.trim());
    if (firstStr) return firstStr.trim();
    return m.length ? String(m[0]) : i18n.t(fallbackKey);
  }
  if (typeof m === 'string' && m.trim()) return m.trim();
  if (m != null && typeof m === 'object' && typeof m.message === 'string') {
    return m.message.trim();
  }

  const fallback = error.message;
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  return i18n.t(fallbackKey);
}
