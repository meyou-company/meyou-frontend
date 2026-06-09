import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SUPPORTED_LOCALES } from '../../i18n/config';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useLocaleStore } from '../../zustand/useLocaleStore';
import './LanguageSettings.scss';

export default function LanguageSettings({ onClose }) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const isSaving = useLocaleStore((s) => s.isSaving);
  const setUserPatch = useAuthStore((s) => s.setUserPatch);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const [pending, setPending] = useState(null);

  const handleSelect = async (code) => {
    if (isSaving || pending) return;
    setPending(code);
    try {
      await setLocale(code, { persistRemote: isAuthed });
      if (isAuthed) {
        setUserPatch({ language: code });
      }
      toast.success(t('settings.languageSaved'));
      onClose?.();
    } catch {
      toast.error(t('settings.languageSaveError'));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="langSettings__overlay" onClick={onClose} role="presentation">
      <div
        className="langSettings__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="langSettingsTitle"
      >
        <header className="langSettings__header">
          <h2 id="langSettingsTitle">{t('settings.languageTitle')}</h2>
          <button type="button" className="langSettings__close" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </header>

        <p className="langSettings__subtitle">{t('settings.languageSubtitle')}</p>

        <ul className="langSettings__list">
          {SUPPORTED_LOCALES.map((code) => {
            const active = locale === code;
            const loading = pending === code;
            return (
              <li key={code}>
                <button
                  type="button"
                  className={`langSettings__option${active ? ' is-active' : ''}`}
                  onClick={() => handleSelect(code)}
                  disabled={isSaving || loading}
                  aria-pressed={active}
                >
                  <span>{t(`settings.languages.${code}`)}</span>
                  {active && <span className="langSettings__check" aria-hidden>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
