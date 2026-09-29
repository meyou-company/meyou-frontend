import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { giftsApi } from '../services/giftsApi';
import { useAuthStore } from '../zustand/useAuthStore';
import { useGiftInboxStore } from '../zustand/useGiftInboxStore';
import GiftBoxOverlay from '../components/Gifts/GiftBoxOverlay';

export function GiftInboxProvider() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const userId = useAuthStore((s) => s.user?.id);
  const hydratePending = useGiftInboxStore((s) => s.hydratePending);
  const pruneOpened = useGiftInboxStore((s) => s.pruneOpened);
  const clear = useGiftInboxStore((s) => s.clear);
  const thankMode = searchParams.get('thank') === '1';
  const showOverlay = location.pathname.startsWith('/my-gifts') && !thankMode;

  useLayoutEffect(() => {
    if (showOverlay) pruneOpened();
  }, [showOverlay, pruneOpened]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthed || !userId) {
      clear();
      return;
    }

    let cancelled = false;
    giftsApi
      .getReceived()
      .then((data) => {
        if (cancelled) return;
        hydratePending(data?.items ?? []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isAuthed, userId, hydratePending, clear]);

  if (!showOverlay) return null;
  return <GiftBoxOverlay />;
}
