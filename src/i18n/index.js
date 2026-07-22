import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import cs from './locales/cs.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import {
  DEFAULT_LOCALE,
  applyDocumentLocaleAttributes,
  normalizeLocale,
} from './config';

const resources = {
  uk: { translation: uk },
  en: { translation: en },
  tr: { translation: tr },
  fr: { translation: fr },
  cs: { translation: cs },
  es: { translation: es },
  ru: { translation: ru },
};

let initialized = false;

export function applyDocumentLocale(locale) {
  return applyDocumentLocaleAttributes(locale);
}

export async function changeLanguage(locale) {
  const code = normalizeLocale(locale);
  await i18n.changeLanguage(code);
  return applyDocumentLocale(code);
}

export function initI18n(initialLocale = DEFAULT_LOCALE) {
  const locale = normalizeLocale(initialLocale);

  if (!initialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: Object.keys(resources),
      interpolation: { escapeValue: false },
      returnEmptyString: false,
      keySeparator: '.',
    });
    initialized = true;
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }

  applyDocumentLocale(locale);
  return i18n;
}

export { i18n };
