import { useEffect } from 'react';
import { giftsApi } from '../services/giftsApi';
import { useAuthStore } from '../zustand/useAuthStore';
import { useGiftInboxStore } from '../zustand/useGiftInboxStore';
import GiftBoxOverlay from '../components/Gifts/GiftBoxOverlay';

export function GiftInboxProvider() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const userId = useAuthStore((s) => s.user?.id);
  const hydratePending = useGiftInboxStore((s) => s.hydratePending);
  const clear = useGiftInboxStore((s) => s.clear);

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

  return <GiftBoxOverlay />;
}
