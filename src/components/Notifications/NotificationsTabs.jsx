import { useState } from 'react';

export default function NotificationsTabs({ onChange, onMarkAllRead }) {
  const [active, setActive] = useState('all');

  const handleClick = (tab) => {
    setActive(tab);
    onChange(tab);
  };

  return (
    <div className="tabs">
      <div className="group">
        <button className={active === 'all' ? 'active' : ''} onClick={() => handleClick('all')}>
          Всі
        </button>

        <button
          className={active === 'unread' ? 'active' : ''}
          onClick={() => handleClick('unread')}
        >
          Непрочитані
        </button>
      </div>

      <button onClick={onMarkAllRead}>Прочитати все</button>
    </div>
  );
}
