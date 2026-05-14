import { useEffect, useState } from 'react';
import './NotificationSettings.scss';
import { notificationsApi } from '../../../services/notificationsApi';

export default function NotificationSettings({ onClose }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // 📥 load from backend
  useEffect(() => {
    const load = async () => {
      try {
        const data = await notificationsApi.getSettings();
        setSettings(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 🔁 toggle locally + save
  const toggle = async (key) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(updated);

    await notificationsApi.updateSettings({
      [key]: updated[key],
    });
  };

  if (loading || !settings) return <p>Loading...</p>;

  const items = [
    {
      id: 'postComment',
      title: 'Комментарии',
      desc: 'Комментарии и ответы',
      icon: '💬',
    },
    {
      id: 'postLike',
      title: 'Лайки и активность',
      desc: 'Лайки и подписки',
      icon: '❤️',
    },
    {
      id: 'newFollower',
      title: 'Подписки',
      desc: 'Новые подписчики',
      icon: '👥',
    },
    {
      id: 'system',
      title: 'Системные уведомления',
      desc: 'Обновления и безопасность',
      icon: '🔒',
    },
  ];

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
          {items.map((item) => (
            <div key={item.id} className="ns-item">
              <div className="ns-left">
                <span className="ns-icon">{item.icon}</span>

                <div>
                  <p className="ns-title">{item.title}</p>
                  <p className="ns-desc">{item.desc}</p>
                </div>
              </div>

              <button
                className={`ns-toggle ${settings[item.id] ? 'active' : ''}`}
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
