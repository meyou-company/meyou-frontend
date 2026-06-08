import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import profileIcons from '../../constants/profileIcons';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useLocaleStore } from '../../zustand/useLocaleStore';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';

function SettingsNavRow({ label, desc, value, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="settings-card__row"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="settings-card__meta">
        <span className="settings-card__label">{label}</span>
        {desc ? <span className="settings-card__desc">{desc}</span> : null}
      </div>
      {value ? <span className="settings-card__value">{value}</span> : null}
      <img
        src={profileIcons.arrowRightFilledBlack}
        alt=""
        className="settings-card__chevron"
        aria-hidden="true"
      />
    </button>
  );
}

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentLocale = useLocaleStore((s) => s.locale);
  const openLanguageSettings = useLocaleStore((s) => s.openLanguageSettings);

  const email = user?.email || '';

  return (
    <SettingsPageShell
      title={t('settings.account.title')}
      subtitle={t('settings.account.subtitle')}
      onBack={() => navigate(-1)}
    >
      {email ? (
        <div className="settings-card settings-page__email">
          <span>{t('settings.account.emailLabel')}</span>
          <strong>{email}</strong>
        </div>
      ) : null}

      <div className="settings-card">
        <SettingsNavRow
          label={t('settings.account.items.language')}
          desc={t('settings.account.itemDesc.language')}
          value={t(`settings.languages.${currentLocale}`)}
          onClick={() => openLanguageSettings()}
        />
        <SettingsNavRow
          label={t('settings.account.items.changePassword')}
          desc={t('settings.account.itemDesc.changePassword')}
          onClick={() => navigate('/settings/change-password')}
        />
        <SettingsNavRow
          label={t('settings.account.items.privacy')}
          desc={t('settings.account.itemDesc.privacy')}
          onClick={() => navigate('/settings/privacy')}
        />
        <SettingsNavRow
          label={t('settings.account.items.security')}
          desc={t('settings.account.itemDesc.security')}
          onClick={() => navigate('/settings/security')}
        />
      </div>
    </SettingsPageShell>
  );
}
