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
          Все
        </button>

        <button
          className={active === 'unread' ? 'active' : ''}
          onClick={() => handleClick('unread')}
        >
          Непрочитанные
        </button>
      </div>

      <button onClick={onMarkAllRead}>Прочитать все</button>
    </div>
  );
}
