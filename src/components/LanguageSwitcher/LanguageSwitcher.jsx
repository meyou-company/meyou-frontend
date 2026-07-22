import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeLocale } from '../../i18n/config';
import { useLocaleStore } from '../../zustand/useLocaleStore';
import './LanguageSwitcher.scss';

const PUBLIC_LANGUAGE_OPTIONS = ['uk', 'en', 'ru', 'cs', 'fr', 'es', 'tr'];
const LANGUAGE_FLAGS = {
  uk: '🇺🇦',
  en: '🇬🇧',
  ru: '🇷🇺',
  cs: '🇨🇿',
  fr: '🇫🇷',
  es: '🇪🇸',
  tr: '🇹🇷',
};

export default function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const activeLocale = normalizeLocale(i18n.resolvedLanguage || i18n.language || locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const isSaving = useLocaleStore((s) => s.isSaving);

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const onSelect = async (code) => {
    if (isSaving) return;
    await setLocale(code, { persistRemote: false });
    setOpen(false);
  };

  return (
    <div className={`langSwitch ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="langSwitch__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🌐</span>
        <span className={`langSwitch__arrow${open ? ' is-open' : ''}`} aria-hidden="true">
          ▼
        </span>
      </button>

      {open ? (
        <div className="langSwitch__menu" role="menu">
          {PUBLIC_LANGUAGE_OPTIONS.map((code) => {
            const active = code === activeLocale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`langSwitch__item${active ? ' is-active' : ''}`}
                onClick={() => onSelect(code)}
                disabled={isSaving}
              >
                <span aria-hidden="true">{LANGUAGE_FLAGS[code] || '🌐'}</span>
                <span className="langSwitch__label">{t(`settings.languages.${code}`)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
