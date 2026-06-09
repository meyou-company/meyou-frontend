import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SettingsPageShell from '../../components/Settings/SettingsPageShell';
import '../../components/Settings/SettingsPageShell.scss';

const STORAGE_KEY = 'meyou_privacy_settings';

const DEFAULT_SETTINGS = {
  profilePublic: true,
  showOnline: true,
  allowMessages: true,
  searchVisible: true,
};

const PRIVACY_KEYS = [
  { key: 'profilePublic', itemKey: 'profilePublic' },
  { key: 'showOnline', itemKey: 'showOnline' },
  { key: 'allowMessages', itemKey: 'allowMessages' },
  { key: 'searchVisible', itemKey: 'searchVisible' },
];

function readStoredSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function PrivacyToggle({ itemKey, value, onToggle, disabled }) {
  const { t } = useTranslation();

  return (
    <div className="settings-toggle">
      <div className="settings-toggle__meta">
        <span className="settings-card__label">
          {t(`settings.privacy.items.${itemKey}.title`)}
        </span>
        <span className="settings-card__desc">
          {t(`settings.privacy.items.${itemKey}.desc`)}
        </span>
      </div>
      <button
        type="button"
        className={`settings-toggle__switch${value ? ' is-on' : ''}`}
        aria-pressed={value}
        aria-label={t(`settings.privacy.items.${itemKey}.title`)}
        disabled={disabled}
        onClick={onToggle}
      />
    </div>
  );
}

export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    setSettings(readStoredSettings());
  }, []);

  const toggle = async (key) => {
    if (!settings || savingKey) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingKey(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast.success(t('settings.privacy.saved'));
    } catch {
      setSettings(settings);
      toast.error(t('settings.privacy.saveError'));
    } finally {
      setSavingKey(null);
    }
  };

  if (!settings) {
    return (
      <SettingsPageShell
        title={t('settings.privacy.title')}
        subtitle={t('settings.privacy.subtitle')}
        onBack={() => navigate('/settings/account')}
      >
        <p>{t('settings.privacy.loading')}</p>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell
      title={t('settings.privacy.title')}
      subtitle={t('settings.privacy.subtitle')}
      onBack={() => navigate('/settings/account')}
    >
      <div className="settings-card">
        {PRIVACY_KEYS.map(({ key, itemKey }) => (
          <PrivacyToggle
            key={key}
            itemKey={itemKey}
            value={settings[key] === true}
            disabled={savingKey === key}
            onToggle={() => toggle(key)}
          />
        ))}
      </div>
    </SettingsPageShell>
  );
}
