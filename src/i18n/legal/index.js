import {
  LEGAL_DOCUMENTS,
  LEGAL_NAV,
  LEGAL_UI,
  LEGAL_VERSION,
} from './uk.js';

const LOCALES = {
  uk: { LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI },
  en: { LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI },
  ru: { LEGAL_DOCUMENTS, LEGAL_NAV, LEGAL_UI },
};

/** @param {string} locale */
export function getLegalLocale(locale) {
  const code = String(locale || 'uk').split('-')[0].toLowerCase();
  return LOCALES[code] ?? LOCALES.uk;
}

/** @param {string} locale @param {keyof typeof LEGAL_DOCUMENTS} documentKey */
export function getLegalDocument(locale, documentKey) {
  const pack = getLegalLocale(locale);
  return pack.LEGAL_DOCUMENTS[documentKey] ?? null;
}

export function getLegalNav(locale) {
  return getLegalLocale(locale).LEGAL_NAV;
}

export function getLegalUi(locale) {
  return getLegalLocale(locale).LEGAL_UI;
}

export { LEGAL_VERSION };
