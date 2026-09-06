import { create } from 'zustand';

function giftSendId(item) {
  return item?.id || item?.giftSendId || null;
}

export const useGiftInboxStore = create((set, get) => ({
  queue: [],

  enqueue: (item) => {
    const id = giftSendId(item);
    if (!id || item?.status === 'OPENED') return;
    const exists = get().queue.some((queued) => giftSendId(queued) === id);
    if (exists) return;
    set((state) => ({ queue: [...state.queue, item] }));
  },

  hydratePending: (items) => {
    const pending = (Array.isArray(items) ? items : []).filter(
      (item) => giftSendId(item) && item.status !== 'OPENED',
    );
    if (pending.length === 0) return;
    set((state) => {
      const seen = new Set(state.queue.map(giftSendId));
      const next = [...state.queue];
      for (const item of pending) {
        const id = giftSendId(item);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        next.push(item);
      }
      return { queue: next };
    });
  },

  dismissCurrent: () => {
    set((state) => ({ queue: state.queue.slice(1) }));
  },

  clear: () => set({ queue: [] }),
}));
