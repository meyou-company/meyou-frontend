import { normalizeLocale } from '../config';
import {
  FEATURE_NAV as UK_NAV,
  FEATURE_PAGES as UK_PAGES,
  FEATURE_UI as UK_UI,
} from './uk.js';
import * as en from './en.js';
import * as ru from './ru.js';
import * as cs from './cs.js';
import * as fr from './fr.js';
import * as es from './es.js';
import * as tr from './tr.js';

const UK = {
  FEATURE_NAV: UK_NAV,
  FEATURE_PAGES: UK_PAGES,
  FEATURE_UI: UK_UI,
};

function buildLocale(partial) {
  return {
    FEATURE_NAV: partial.FEATURE_NAV ?? UK.FEATURE_NAV,
    FEATURE_UI: partial.FEATURE_UI ?? UK.FEATURE_UI,
    FEATURE_PAGES: {
      ...UK.FEATURE_PAGES,
      ...partial.FEATURE_PAGES,
    },
  };
}

const LOCALES = {
  uk: UK,
  en: buildLocale(en),
  ru: buildLocale(ru),
  cs: buildLocale(cs),
  fr: buildLocale(fr),
  es: buildLocale(es),
  tr: buildLocale(tr),
};

export function getFeatureLocale(locale) {
  const code = normalizeLocale(locale);
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
