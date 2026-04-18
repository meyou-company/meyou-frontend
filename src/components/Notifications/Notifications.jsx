import { useState } from 'react';
import profileIcons from '../../constants/profileIcons';
import './Notifications.scss';
import NotificationsTabs from './NotificationsTabs';
import NotificationItem from './NotificationItem';
import { getDayLabel } from './utils';
import { notificationsMock } from './notificationsMock';
import NotificationSettings from './Settings/NotificationSettings';

export default function Notifications({ onGoBack }) {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const data = notificationsMock;

  const filtered = data.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const grouped = filtered.reduce((acc, item) => {
    const day = getDayLabel(item.createdAt);
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {});

  const markAllRead = () => {
    // тут мутація на бек
    console.log('mark all read');
  };

  return (
    <div className="notifications">
      <Header onGoBack={onGoBack} onOpenSettings={() => setOpen(true)} />
      <main className="notifications__content">
        <div className="divider-top" />
        <NotificationsTabs onChange={setFilter} onMarkAllRead={markAllRead} />
        <div className="divider-bottom" />
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <h4 className="h">{day}</h4>

            {items.map((item) => (
              <NotificationItem key={item.id} item={item} />
            ))}
          </div>
        ))}
        {open && <NotificationSettings onClose={() => setOpen(false)} />}
      </main>
    </div>
  );
}

/* ================= Header ================= */

const Header = ({ onGoBack, onOpenSettings }) => (
  <header className="notifications__topbar">
    {/* Кнопка для мобілки */}
    <button className="notifications__back notifications__back--mobile" onClick={onGoBack}>
      <img
        className="notifications__back-icon"
        src={profileIcons.arrowLeftFilledBlack}
        alt="Назад"
      />
    </button>

    {/* Кнопка для планшету і вище */}
    <button className="notifications__back notifications__back--tablet" onClick={onGoBack}>
      <img className="notifications__back-icon" src={profileIcons.arrowLeftBlack} alt="Назад" />
    </button>

    <h1 className="notifications__title">Сповіщення</h1>

    <button
      className="notifications__settings"
      aria-label="Налаштування сповіщень"
      onClick={onOpenSettings}
    >
      <img src={profileIcons.settingsBlack} alt="Налаштування сповіщень" />
    </button>
  </header>
);
