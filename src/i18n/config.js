/** Shared locale config for web and future React Native / Expo. */
export const SUPPORTED_LOCALES = ['uk', 'en', 'tr', 'fr', 'cs', 'es', 'ru', 'ar'];

export const DEFAULT_LOCALE = 'uk';

export const RTL_LOCALES = new Set(['ar']);

export const LOCALE_STORAGE_KEY = 'meyou_locale';

export function isSupportedLocale(value) {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value.toLowerCase());
}

export function normalizeLocale(value) {
  if (!value || typeof value !== 'string') return DEFAULT_LOCALE;
  const code = value.trim().toLowerCase();
  return isSupportedLocale(code) ? code : DEFAULT_LOCALE;
}

export function isRtlLocale(locale) {
  return RTL_LOCALES.has(normalizeLocale(locale));
}

export function getLocaleDirection(locale) {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const raw of langs) {
    if (!raw) continue;
    const base = raw.split('-')[0].toLowerCase();
    if (isSupportedLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

export function readStoredLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isSupportedLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredLocale(locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale));
  } catch {
    /* ignore */
  }
}
