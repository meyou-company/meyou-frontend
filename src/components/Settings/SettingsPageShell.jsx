import { useTranslation } from 'react-i18next';
import './SettingsPageShell.scss';

export default function SettingsPageShell({
  title,
  subtitle,
  onBack,
  children,
  className = '',
}) {
  const { t } = useTranslation();

  return (
    <div className={`settings-page ${className}`.trim()}>
      <div className="settings-page__inner">
        <header className="settings-page__header">
          <button
            type="button"
            className="settings-page__back"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <span className="settings-page__back-icon" aria-hidden="true" />
          </button>
          <div className="settings-page__titles">
            <h1 className="settings-page__title">{title}</h1>
            {subtitle ? <p className="settings-page__subtitle">{subtitle}</p> : null}
          </div>
        </header>
        <div className="settings-page__body">{children}</div>
      </div>
    </div>
  );
}
