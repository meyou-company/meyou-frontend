import { create } from 'zustand';
import { changeLanguage, i18n } from '../i18n';
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  normalizeLocale,
  readStoredLocale,
  writeStoredLocale,
} from '../i18n/config';
import { profileApi } from '../services/profileApi';

export function resolveInitialLocale(userLanguage) {
  if (userLanguage) return normalizeLocale(userLanguage);
  return readStoredLocale() || detectBrowserLocale() || DEFAULT_LOCALE;
}

export const useLocaleStore = create((set, get) => ({
  locale: DEFAULT_LOCALE,
  isLanguageSettingsOpen: false,
  isSaving: false,

  openLanguageSettings: () => set({ isLanguageSettingsOpen: true }),
  closeLanguageSettings: () => set({ isLanguageSettingsOpen: false }),

  /** First paint / cold start only — called from main.jsx via initI18n. */
  initLocale: async (userLanguage) => {
    const locale = resolveInitialLocale(userLanguage);
    if (get().locale === locale && i18nLanguageMatches(locale)) {
      return locale;
    }
    await changeLanguage(locale);
    set({ locale });
    writeStoredLocale(locale);
    return locale;
  },

  /** Sync from server profile when user.language differs from active locale. */
  syncLocaleFromUser: async (userLanguage) => {
    const locale = normalizeLocale(userLanguage);
    if (get().locale === locale) return locale;
    await changeLanguage(locale);
    set({ locale });
    writeStoredLocale(locale);
    return locale;
  },

  setLocale: async (nextLocale, { persistRemote = true } = {}) => {
    const locale = normalizeLocale(nextLocale);
    const prev = get().locale;
    if (prev === locale && i18nLanguageMatches(locale)) return locale;

    set({ isSaving: true });
    try {
      await changeLanguage(locale);
      writeStoredLocale(locale);
      set({ locale });

      if (persistRemote) {
        try {
          await profileApi.updateLanguage(locale);
        } catch (e) {
          console.error('[locale] save to profile failed', e);
          throw e;
        }
      }

      return locale;
    } finally {
      set({ isSaving: false });
    }
  },
}));

function i18nLanguageMatches(locale) {
  return normalizeLocale(i18n.language) === normalizeLocale(locale);
}
