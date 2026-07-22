import { useEffect, useRef } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../i18n';
import { normalizeLocale } from '../i18n/config';
import { useAuthStore } from '../zustand/useAuthStore';
import { useLocaleStore } from '../zustand/useLocaleStore';

export function I18nProvider({ children }) {
  const userLanguage = useAuthStore((s) => s.user?.language);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const initLocale = useLocaleStore((s) => s.initLocale);
  const syncLocaleFromUser = useLocaleStore((s) => s.syncLocaleFromUser);
  const didInitRef = useRef(false);
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    void initLocale(userLanguage);
  }, [isAuthLoading, userLanguage, initLocale]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!userLanguage) return;

    const normalized = normalizeLocale(userLanguage);
    if (lastSyncedRef.current === normalized) return;

    lastSyncedRef.current = normalized;
    void syncLocaleFromUser(normalized);
  }, [isAuthLoading, userLanguage, syncLocaleFromUser]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
