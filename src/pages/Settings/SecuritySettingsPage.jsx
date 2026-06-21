import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import profileIcons from '../../constants/profileIcons';
import DeleteAccountConfirmModal from '../../components/Settings/DeleteAccountConfirmModal';
import { profileApi } from '../../services/profileApi';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useNotificationsStore } from '../../zustand/useNotificationsStore';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';
import '../../components/Settings/DeleteAccountConfirmModal.scss';

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
  const clearSession = useAuthStore((s) => s.clearSession);
  const resetNotifications = useNotificationsStore.getState().reset;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await profileApi.deleteAccount();
      try {
        await logout();
      } catch {
        /* session may already be invalid after delete */
      }
      clearSession();
      resetNotifications();
      setDeleteModalOpen(false);
      toast.success(t('settings.security.deleteAccount.success'));
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) || t('settings.security.deleteAccount.error'),
      );
    } finally {
      setIsDeleting(false);
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

      <div className="settings-card settings-danger-zone">
        <h2 className="settings-danger-zone__title">
          {t('settings.security.deleteAccount.dangerZoneTitle')}
        </h2>
        <p className="settings-danger-zone__desc">
          {t('settings.security.deleteAccount.dangerZoneDesc')}
        </p>
        <button
          type="button"
          className="settings-danger-zone__btn"
          onClick={() => setDeleteModalOpen(true)}
          disabled={isDeleting}
        >
          {t('settings.security.deleteAccount.deleteButton')}
        </button>
      </div>

      <DeleteAccountConfirmModal
        isOpen={deleteModalOpen}
        confirming={isDeleting}
        onCancel={() => {
          if (!isDeleting) setDeleteModalOpen(false);
        }}
        onConfirm={handleDeleteAccount}
      />
    </SettingsPageShell>
  );
}
