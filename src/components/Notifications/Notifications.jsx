import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <Header
        onClick={onGoBack}
        onOpenSettings={() => setSettingsOpen(true)}
        title={t('notifications.title')}
        settingsLabel={t('notifications.settingsTitle')}
        backLabel={t('common.back')}
      />

      <main className="notifications__content">
        <div className="divider-top" />
        <NotificationsTabs onChange={setFilter} onMarkAllRead={markAllRead} />

        <div className="divider-bottom" />

        {loadingInitial && <GlobalLoader />}

        {!loadingInitial && items.length === 0 && (
          <div className="notifications__empty">{t('notifications.empty')}</div>
        )}

        {!loadingInitial && items.length > 0 && filtered.length === 0 && filter === 'unread' && (
          <div className="notifications__empty">{t('notifications.emptyUnread')}</div>
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
          <div className="notifications__loading-more">{t('common.loading')}</div>
        )}

        {settingsOpen && <NotificationSettings onClose={() => setSettingsOpen(false)} />}
      </main>
    </div>
  );
}

// /* ================= Header ================= */

const Header = ({ onClick, onOpenSettings, title, settingsLabel, backLabel }) => (
  <header className="notifications__topbar">
    <button className="notifications__back notifications__back--mobile" onClick={onClick}>
      <img
        className="notifications__back-icon"
        src={profileIcons.arrowLeftFilledBlack}
        alt={backLabel}
      />
    </button>

    <button className="notifications__back notifications__back--tablet" onClick={onClick}>
      <img className="notifications__back-icon" src={profileIcons.arrowLeftBlack} alt={backLabel} />
    </button>

    <h1 className="notifications__title">{title}</h1>

    <button
      className="notifications__settings"
      aria-label={settingsLabel}
      onClick={onOpenSettings}
    >
      <img src={profileIcons.settingsBlack} alt={settingsLabel} />
    </button>
  </header>
);
