import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import profileIcons from '../../constants/profileIcons';
import NotificationsTabs from './NotificationsTabs';
import NotificationItem from './NotificationItem';
import NotificationSettings from './Settings/NotificationSettings';

import { getDayLabel } from './utils';
import { notificationsApi } from '../../services/notificationsApi';

import { useNotificationsStore } from '../../zustand/useNotificationsStore';
import { useFollowingStore } from '../../zustand/useFollowingStore';

import './Notifications.scss';

const PAGE_LIMIT = 10;

export default function Notifications({ onGoBack }) {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);

  const [notificationsData, setNotificationsData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_LIMIT });

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const markAllAsReadStore = useNotificationsStore((s) => s.markAllAsRead);
  const markAsReadStore = useNotificationsStore((s) => s.markAsRead);
  const fetchFollowing = useFollowingStore((s) => s.fetchFollowing);

  const loadMoreRef = useRef(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const hasMore = useMemo(() => {
    const totalPages = Math.ceil((meta.total || 0) / (meta.limit || PAGE_LIMIT));
    return meta.page < totalPages;
  }, [meta]);

  const loadNotifications = useCallback(async (pageNumber = 1, replace = false) => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    if (replace && notificationsData.length === 0) {
      setLoadingInitial(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await notificationsApi.list({
        page: pageNumber,
        limit: PAGE_LIMIT,
      });

      const newItems = res.data || [];
      const nextMeta = res.meta || { total: 0, page: pageNumber, limit: PAGE_LIMIT };

      setNotificationsData((prev) => {
        const merged = replace ? newItems : [...prev, ...newItems];

        const unique = merged.filter((item, index, self) => {
          // FOLLOW → унікальність по actor
          if (item.type === 'newFollower') {
            return (
              index === self.findIndex((n) => n.type === item.type && n.actor.id === item.actor.id)
            );
          }

          // інші нотифікації → по id
          return index === self.findIndex((n) => n.id === item.id);
        });

        return unique;
      });
      // setNotificationsData((prev) => {
      //   // replace = повний refresh
      //   if (replace) {
      //     return newItems;
      //   }

      //   // merge без дублікатів по id
      //   const map = new Map();

      //   [...prev, ...newItems].forEach((item) => {
      //     map.set(item.id, item);
      //   });

      //   return Array.from(map.values());
      // });
      setMeta(nextMeta);
    } finally {
      fetchingRef.current = false;

      if (replace && notificationsData.length === 0) {
        setLoadingInitial(false);
      }

      setLoadingMore(false);
    }
  }, []);
  // }, [notificationsData.length]);

  useEffect(() => {
    loadNotifications(1, true);
  }, [loadNotifications]);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];

        if (first.isIntersecting && !loadingMore && hasMore) {
          loadNotifications(meta.page + 1);
        }
      },
      { threshold: 0.1 }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadNotifications, meta.page]);

  const markAllRead = useCallback(async () => {
    await markAllAsReadStore();
    await loadNotifications(1, true);
  }, [markAllAsReadStore, loadNotifications]);

  const markAsRead = useCallback(
    async (id) => {
      await markAsReadStore(id);

      setNotificationsData((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    },
    [markAsReadStore]
  );

  const filtered = useMemo(() => {
    return notificationsData.filter((n) => {
      if (filter === 'unread') return !n.isRead;
      return true;
    });
  }, [notificationsData, filter]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      const day = getDayLabel(item.createdAt);
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="notifications">
      <Header onClick={onGoBack} onOpenSettings={() => setOpen(true)} />

      <main className="notifications__content">
        <div className="divider-top" />

        <NotificationsTabs onChange={setFilter} onMarkAllRead={markAllRead} />

        <div className="divider-bottom" />

        {loadingInitial && <div className="notifications__loading">Loading...</div>}
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <h4 className="h">{day}</h4>

            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onRead={markAsRead} />
            ))}
          </div>
        ))}
        <div ref={loadMoreRef} style={{ height: 1 }} />

        <div className="notifications__loading-more">{loadingMore && <p>Loading more...</p>}</div>

        {open && <NotificationSettings onClose={() => setOpen(false)} />}
      </main>
    </div>
  );
}

/* ================= Header ================= */

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
