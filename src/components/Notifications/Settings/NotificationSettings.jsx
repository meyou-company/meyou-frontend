import { useState } from 'react';
import './NotificationSettings.scss';

const settingsMock = [
  {
    id: 'comments',
    title: 'Комментарии',
    desc: 'Комментарии и ответы',
    enabled: true,
    icon: '💬',
  },
  {
    id: 'activity',
    title: 'Другие действия',
    desc: 'Лайки и подписки',
    enabled: true,
    icon: '❤️',
  },
  {
    id: 'friends',
    title: 'Запросы на дружбу',
    desc: 'Кто добавил вас в друзья',
    enabled: true,
    icon: '👥',
  },
  {
    id: 'tags',
    title: 'Отметки',
    desc: 'Кто вас отметил',
    enabled: true,
    icon: '🏷',
  },
  {
    id: 'account',
    title: 'Оповещения аккаунта',
    desc: 'Кто вас отметил',
    enabled: true,
    icon: '🛡',
  },
  {
    id: 'security',
    title: 'Оповещения безопасности',
    desc: 'Попытки входа',
    enabled: true,
    icon: '🔒',
  },
  {
    id: 'updates',
    title: 'Важные обновления',
    desc: 'Системные новости и обновления',
    enabled: false,
    icon: '❗',
  },
];

export default function NotificationSettings({ onClose }) {
  const [settings, setSettings] = useState(settingsMock);

  const toggle = (id) => {
    setSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  return (
    <div className="ns-overlay">
      <div className="ns-modal">
        <div className="ns-header">
          <h2>Оповещения</h2>
          <button className="ns-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="ns-subtitle">Настройте оповещения, которые вы хотите получать</p>

        <div className="ns-list">
          {settings.map((item) => (
            <div key={item.id} className="ns-item">
              <div className="ns-left">
                <span className="ns-icon">{item.icon}</span>

                <div>
                  <p className="ns-title">{item.title}</p>
                  <p className="ns-desc">{item.desc}</p>
                </div>
              </div>

              <button
                className={`ns-toggle ${item.enabled ? 'active' : ''}`}
                onClick={() => toggle(item.id)}
              >
                <span className="ns-thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
