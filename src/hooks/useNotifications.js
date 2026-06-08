import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../services/notificationsApi';
import { useNotificationsStore } from '../zustand/useNotificationsStore';
import { useFollowingStore } from '../zustand/useFollowingStore';

const LIMIT = 10;

export function useNotifications() {
  const [meta, setMeta] = useState({ page: 1, total: 0, limit: LIMIT });
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const items = useNotificationsStore((s) => s.items);
  const setItems = useNotificationsStore((s) => s.setItems);

  const markAllAsReadStore = useNotificationsStore((s) => s.markAllAsRead);
  const markAsReadStore = useNotificationsStore((s) => s.markAsRead);
  const fetchFollowing = useFollowingStore((s) => s.fetchFollowing);

  const fetchingRef = useRef(false);

  const hasMore = meta.page < Math.ceil((meta.total || 0) / (meta.limit || LIMIT));

  const fetchPage = useCallback(
    async (page = 1, replace = false) => {
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

        if (replace) {
          setItems(newItems);
        } else {
          const merged = new Map();

          [...items, ...newItems].forEach((n) => merged.set(n.id, n));

          setItems(Array.from(merged.values()));
        }

        setMeta(nextMeta);
      } finally {
        fetchingRef.current = false;
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [items, setItems]
  );

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
      const updated = items.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n));

      setItems(updated);
    },
    [items, setItems, markAsReadStore]
  );

  const markAllRead = useCallback(async () => {
    await markAllAsReadStore();

    const now = new Date().toISOString();

    const updated = items.map((n) => ({
      ...n,
      readAt: n.readAt ?? now,
    }));

    setItems(updated);
  }, [items, setItems, markAllAsReadStore]);

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
