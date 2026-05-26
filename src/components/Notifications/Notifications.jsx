import { useMemo, useState } from 'react';
import NotificationsTabs from './NotificationsTabs';
import NotificationItem from './NotificationItem';
import NotificationSettings from './Settings/NotificationSettings';

import profileIcons from '../../constants/profileIcons';
import GlobalLoader from '../GlobalLoader/GlobalLoader';

import { getDayLabel } from '../../utils/utils';
import { getNotificationDate } from '../../utils/getNotificationDate';

import { useNotifications } from '../../hooks/useNotifications';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

import './Notifications.scss';

export default function Notifications({ onGoBack }) {
  const [filter, setFilter] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { items, meta, loadingInitial, loadingMore, hasMore, loadMore, markAsRead, markAllRead } =
    useNotifications();

  const loadMoreRef = useInfiniteScroll(loadMore, hasMore);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === 'unread') return !n.readAt;
      return true;
    });
  }, [items, filter]);

  const visibleHasMore = useMemo(() => {
    if (filter === 'unread') {
      return filtered.length >= meta.limit && hasMore;
    }

    return hasMore;
  }, [filter, filtered.length, hasMore, meta.limit]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      const day = getDayLabel(getNotificationDate(item));

      if (!acc[day]) acc[day] = [];

      acc[day].push(item);

      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="notifications">
      <Header onClick={onGoBack} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="notifications__content">
        <div className="divider-top" />
        <NotificationsTabs onChange={setFilter} onMarkAllRead={markAllRead} />

        <div className="divider-bottom" />

        {loadingInitial && <GlobalLoader />}

        {!loadingInitial && items.length === 0 && (
          <div className="notifications__empty">У вас пока нет уведомлений</div>
        )}

        {!loadingInitial && items.length > 0 && filtered.length === 0 && filter === 'unread' && (
          <div className="notifications__empty">У вас нет непрочитанных сообщений</div>
        )}

        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <h4>{day}</h4>

            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onRead={markAsRead} />
            ))}
          </div>
        ))}

        <div ref={loadMoreRef} style={{ height: 1 }} />

        {visibleHasMore && loadingMore && (
          <div className="notifications__loading-more">Loading more...</div>
        )}

        {settingsOpen && <NotificationSettings onClose={() => setSettingsOpen(false)} />}
      </main>
    </div>
  );
}

// /* ================= Header ================= */

const Header = ({ onClick, onOpenSettings }) => (
  <header className="notifications__topbar">
    {/* Кнопка для мобілки */}
    <button className="notifications__back notifications__back--mobile" onClick={onClick}>
      <img
        className="notifications__back-icon"
        src={profileIcons.arrowLeftFilledBlack}
        alt="Back"
      />
    </button>

    {/* Кнопка для планшету і вище */}
    <button className="notifications__back notifications__back--tablet" onClick={onClick}>
      <img className="notifications__back-icon" src={profileIcons.arrowLeftBlack} alt="Back" />
    </button>

    <h1 className="notifications__title">Уведомления</h1>

    <button
      className="notifications__settings"
      aria-label="Настройка уведомлений"
      onClick={onOpenSettings}
    >
      <img src={profileIcons.settingsBlack} alt="Настройка уведомлений" />
    </button>
  </header>
);
