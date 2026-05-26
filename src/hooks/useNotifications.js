import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notificationsApi } from '../services/notificationsApi';
import { useNotificationsStore } from '../zustand/useNotificationsStore';
import { useFollowingStore } from '../zustand/useFollowingStore';

const LIMIT = 10;

export function useNotifications() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, limit: LIMIT });
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const markAllAsReadStore = useNotificationsStore((s) => s.markAllAsRead);
  const markAsReadStore = useNotificationsStore((s) => s.markAsRead);
  const fetchFollowing = useFollowingStore((s) => s.fetchFollowing);

  const fetchingRef = useRef(false);

  const hasMore = meta.page < Math.ceil((meta.total || 0) / (meta.limit || LIMIT));

  const fetchPage = useCallback(async (page = 1, replace = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (replace) setLoadingInitial(true);
    else setLoadingMore(true);

    try {
      const res = await notificationsApi.list({
        page,
        limit: LIMIT,
      });

      const newItems = res.data ?? [];
      const nextMeta = res.meta ?? { page, total: 0, limit: LIMIT };

      setItems((prev) => {
        if (replace) return newItems;

        const map = new Map();

        [...prev, ...newItems].forEach((n) => map.set(n.id, n));

        return Array.from(map.values());
      });

      setMeta(nextMeta);
    } finally {
      fetchingRef.current = false;
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    fetchPage(meta.page + 1);
  }, [hasMore, meta.page, fetchPage]);

  const refresh = useCallback(() => {
    return fetchPage(1, true);
  }, [fetchPage]);

  const markAsRead = useCallback(
    async (id) => {
      await markAsReadStore(id);

      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)));
    },
    [markAsReadStore]
  );

  const markAllRead = useCallback(async () => {
    await markAllAsReadStore();

    const now = new Date().toISOString();

    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
  }, [markAllAsReadStore]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  useEffect(() => {
    refresh();
  }, []);

  return {
    items,
    meta,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAllRead,
    refresh,
  };
}
