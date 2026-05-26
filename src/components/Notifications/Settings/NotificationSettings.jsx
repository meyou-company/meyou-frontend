import { useEffect, useState } from 'react';
import { notificationsApi } from '../../../services/notificationsApi';

import './NotificationSettings.scss';

export default function NotificationSettings({ onClose }) {
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

  const toggle = async (key) => {
    if (!settings || savingKey) return;

    const oldValue = settings[key];

    const updated = {
      ...settings,
      [key]: !oldValue,
    };

    // optimistic update
    setSettings(updated);
    setSavingKey(key);

    try {
      await notificationsApi.updateSettings({
        [key]: !oldValue,
      });
    } catch (e) {
      console.error('update settings error', e);

      // rollback
      setSettings((prev) => ({
        ...prev,
        [key]: oldValue,
      }));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className="ns-overlay">
        <div className="ns-modal">
          <div className="ns-loading">Loading...</div>
        </div>
      </div>
    );
  }

  const groups = [
    {
      title: 'Активность',
      items: [
        {
          key: 'followNotifications',
          title: 'Подписки',
          desc: 'Когда кто-то подписывается на вас',
          icon: '👤',
        },
        {
          key: 'likeNotifications',
          title: 'Лайки',
          desc: 'Когда кто-то лайкает ваши публикации',
          icon: '❤️',
        },
        {
          key: 'commentNotifications',
          title: 'Комментарии',
          desc: 'Комментарии к вашим публикациям',
          icon: '💬',
        },
        {
          key: 'mentionNotifications',
          title: 'Упоминания',
          desc: 'Когда вас отмечают в публикациях или комментариях',
          icon: '@',
        },
        {
          key: 'postNotifications',
          title: 'Новые публикации',
          desc: 'Новые публикации пользователей, на которых вы подписаны',
          icon: '🖼️',
        },
      ],
    },

    {
      title: 'Система',
      items: [
        {
          key: 'systemNotifications',
          title: 'Системные уведомления',
          desc: 'Безопасность, обновления и важные события',
          icon: '🔒',
        },
      ],
    },

    {
      title: 'Способ получения',
      items: [
        {
          key: 'pushNotifications',
          title: 'Push-уведомления',
          desc: 'Уведомления внутри приложения',
          icon: '📱',
        },
        {
          key: 'emailNotifications',
          title: 'Email-уведомления',
          desc: 'Получать уведомления на почту',
          icon: '✉️',
        },
      ],
    },
  ];

  return (
    <div className="ns-overlay" onClick={onClose}>
      <div className="ns-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ns-header">
          <h2>Настройки уведомлений</h2>

          <button className="ns-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="ns-subtitle">Выберите, какие уведомления вы хотите получать</p>

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
                        <p className="ns-title">{item.title}</p>
                        <p className="ns-desc">{item.desc}</p>
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
