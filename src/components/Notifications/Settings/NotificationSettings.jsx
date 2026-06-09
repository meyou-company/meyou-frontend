import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../../../services/notificationsApi';

import './NotificationSettings.scss';

export default function NotificationSettings({ onClose }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await notificationsApi.getSettings();
        setSettings(data);
      } catch (e) {
        console.error('settings error', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const groups = useMemo(
    () => [
      {
        title: t('notifications.groups.activity'),
        items: [
          { key: 'followNotifications', icon: '👤', itemKey: 'follow' },
          { key: 'likeNotifications', icon: '❤️', itemKey: 'like' },
          { key: 'commentNotifications', icon: '💬', itemKey: 'comment' },
          { key: 'mentionNotifications', icon: '@', itemKey: 'mention' },
          { key: 'postNotifications', icon: '🖼️', itemKey: 'post' },
        ],
      },
      {
        title: t('notifications.groups.system'),
        items: [{ key: 'systemNotifications', icon: '🔒', itemKey: 'system' }],
      },
      {
        title: t('notifications.groups.delivery'),
        items: [
          { key: 'pushNotifications', icon: '📱', itemKey: 'push' },
          { key: 'emailNotifications', icon: '✉️', itemKey: 'email' },
        ],
      },
    ],
    [t],
  );

  const toggle = async (key) => {
    if (!settings || savingKey) return;

    const oldValue = settings[key];
    const updated = { ...settings, [key]: !oldValue };

    setSettings(updated);
    setSavingKey(key);

    try {
      await notificationsApi.updateSettings({ [key]: !oldValue });
    } catch (e) {
      console.error('update settings error', e);
      setSettings((prev) => ({ ...prev, [key]: oldValue }));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className="ns-overlay">
        <div className="ns-modal">
          <div className="ns-loading">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ns-overlay" onClick={onClose}>
      <div className="ns-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ns-header">
          <h2>{t('notifications.settingsTitle')}</h2>
          <button className="ns-close" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <p className="ns-subtitle">{t('notifications.settingsSubtitle')}</p>

        <div className="ns-groups">
          {groups.map((group) => (
            <div key={group.title} className="ns-group">
              <h3 className="ns-group-title">{group.title}</h3>
              <div className="ns-list">
                {group.items.map((item) => (
                  <div key={item.key} className="ns-item">
                    <div className="ns-left">
                      <span className="ns-icon">{item.icon}</span>
                      <div>
                        <p className="ns-title">{t(`notifications.items.${item.itemKey}.title`)}</p>
                        <p className="ns-desc">{t(`notifications.items.${item.itemKey}.desc`)}</p>
                      </div>
                    </div>
                    <button
                      disabled={savingKey === item.key}
                      className={`ns-toggle ${settings[item.key] ? 'active' : ''}`}
                      onClick={() => toggle(item.key)}
                    >
                      <span className="ns-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
