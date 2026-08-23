import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import { profileApi } from '../../services/profileApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getOwnerVipEnabled } from '../../utils/profileVipUi';
import { useAuthStore } from '../../zustand/useAuthStore';
import '../../components/Settings/SettingsPageShell.scss';

function VipAccessToggle({ value, onToggle, disabled }) {
  const { t } = useTranslation();

  return (
    <div className="settings-toggle">
      <div className="settings-toggle__meta">
        <span className="settings-card__label">{t('settings.vipAccess.toggleTitle')}</span>
        <span className="settings-card__desc">{t('settings.vipAccess.toggleDesc')}</span>
      </div>
      <button
        type="button"
        className={`settings-toggle__switch${value ? ' is-on' : ''}`}
        aria-pressed={value}
        aria-label={t('settings.vipAccess.toggleTitle')}
        disabled={disabled}
        onClick={onToggle}
      />
    </div>
  );
}

export default function VipAccessSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUserPatch = useAuthStore((s) => s.setUserPatch);
  const [vipEnabled, setVipEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVipEnabled(getOwnerVipEnabled(user));
  }, [user]);

  const toggle = async () => {
    if (saving) return;

    const previous = vipEnabled;
    const next = !previous;
    setVipEnabled(next);
    setSaving(true);

    try {
      const data = await profileApi.updateProfile({ vipEnabled: next });
      const saved =
        typeof data?.user?.vipEnabled === 'boolean' ? data.user.vipEnabled : next;
      setVipEnabled(saved);
      setUserPatch({ vipEnabled: saved });
      toast.success(t('settings.vipAccess.saved'));
    } catch (error) {
      setVipEnabled(previous);
      toast.error(getApiErrorMessage(error) || t('settings.vipAccess.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      title={t('settings.vipAccess.title')}
      subtitle={t('settings.vipAccess.subtitle')}
      onBack={() => navigate('/settings/account')}
    >
      <div className="settings-card">
        <VipAccessToggle value={vipEnabled} onToggle={toggle} disabled={saving} />
      </div>
    </SettingsPageShell>
  );
}
