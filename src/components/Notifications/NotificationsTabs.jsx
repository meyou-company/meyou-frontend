import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function NotificationsTabs({ onChange, onMarkAllRead }) {
  const [active, setActive] = useState('all');
  const { t } = useTranslation();

  const handleClick = (tab) => {
    setActive(tab);
    onChange(tab);
  };

  return (
    <div className="tabs">
      <div className="group">
        <button className={active === 'all' ? 'active' : ''} onClick={() => handleClick('all')}>
          {t('notifications.all')}
        </button>

        <button
          className={active === 'unread' ? 'active' : ''}
          onClick={() => handleClick('unread')}
        >
          {t('notifications.unread')}
        </button>
      </div>

      <button onClick={onMarkAllRead}>{t('notifications.markAllAsRead')}</button>
    </div>
  );
}
