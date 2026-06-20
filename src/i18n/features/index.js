import { FEATURE_NAV, FEATURE_PAGES, FEATURE_UI } from './uk.js';

const LOCALES = {
  uk: { FEATURE_NAV, FEATURE_PAGES, FEATURE_UI },
  en: { FEATURE_NAV, FEATURE_PAGES, FEATURE_UI },
  ru: { FEATURE_NAV, FEATURE_PAGES, FEATURE_UI },
};

export function getFeatureLocale(locale) {
  const code = String(locale || 'uk').split('-')[0].toLowerCase();
  return LOCALES[code] ?? LOCALES.uk;
}

export function getFeaturePage(locale, pageKey) {
  return getFeatureLocale(locale).FEATURE_PAGES[pageKey] ?? null;
}

export function getFeatureNav(locale) {
  return getFeatureLocale(locale).FEATURE_NAV;
}

export function getFeatureUi(locale) {
  return getFeatureLocale(locale).FEATURE_UI;
}
