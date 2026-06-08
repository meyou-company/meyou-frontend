import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import profileIcons from '../../constants/profileIcons';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useNotificationsStore } from '../../zustand/useNotificationsStore';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';

function SettingsNavRow({ label, desc, badge, onClick, disabled = false }) {
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
      {badge ? <span className="settings-card__badge">{badge}</span> : null}
      {!disabled ? (
        <img
          src={profileIcons.arrowRightFilledBlack}
          alt=""
          className="settings-card__chevron"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const resetNotifications = useNotificationsStore.getState().reset;

  const handleLogoutAll = async () => {
    if (!window.confirm(t('settings.security.logoutAllConfirm'))) return;
    try {
      await logout();
      resetNotifications();
      toast.success(t('settings.security.logoutAllSuccess'));
      navigate('/auth/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <SettingsPageShell
      title={t('settings.security.title')}
      subtitle={t('settings.security.subtitle')}
      onBack={() => navigate('/settings/account')}
    >
      <div className="settings-card">
        <SettingsNavRow
          label={t('settings.security.items.changePassword.title')}
          desc={t('settings.security.items.changePassword.desc')}
          onClick={() => navigate('/settings/change-password')}
        />
        <SettingsNavRow
          label={t('settings.security.items.twoFactor.title')}
          desc={t('settings.security.items.twoFactor.desc')}
          badge={t('settings.security.items.twoFactor.comingSoon')}
          disabled
        />
        <SettingsNavRow
          label={t('settings.security.items.sessions.title')}
          desc={t('settings.security.items.sessions.desc')}
          badge={t('settings.security.comingSoon')}
          disabled
        />
      </div>

      <div className="settings-card">
        <button type="button" className="settings-card__row" onClick={handleLogoutAll}>
          <div className="settings-card__meta">
            <span className="settings-card__label">{t('settings.security.logoutAll')}</span>
          </div>
        </button>
      </div>
    </SettingsPageShell>
  );
}
