import { create } from 'zustand';
import { notificationsApi } from '../services/notificationsApi';
import { resetThrottle, throttledDedupeAsync } from '../utils/throttledDedupeAsync';

const UNREAD_KEY = 'notifications:unread-count';
const UNREAD_THROTTLE_MS = 15000;

export const useNotificationsStore = create((set, get) => ({
  unreadCount: 0,
  items: [],
  isLoading: false,

  fetchUnreadCount: (force = false) =>
    throttledDedupeAsync(
      UNREAD_KEY,
      async () => {
        try {
          set({ isLoading: true });
          const data = await notificationsApi.getUnreadCount();
          set({ unreadCount: data.count });
          return data;
        } catch (e) {
          console.error('FETCH UNREAD ERROR:', e);
        } finally {
          set({ isLoading: false });
        }
      },
      UNREAD_THROTTLE_MS,
      { force },
    ),

  setItems: (items) => set({ items }),

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      get().markAllReadLocal();
      resetThrottle(UNREAD_KEY);
    } catch (e) {
      console.error('MARK ALL READ ERROR:', e);
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      get().markNotificationReadLocal(id);
    } catch (e) {
      console.error('MARK ONE READ ERROR:', e);
    }
  },

  addNotification: (notification, options = {}) =>
    set((state) => {
      // const skipUnreadBump = options.skipUnreadBump === true;
      const exists = state.items.some((item) => item.id === notification.id);

      const filtered = state.items.filter((item) => item.id !== notification.id);

      return {
        items: [notification, ...filtered],
        unreadCount: options.skipUnreadBump
          ? state.unreadCount
          : state.unreadCount + (exists ? 0 : 1),
      };
    }),
  updateNotification: (notification) =>
    set((state) => {
      const filtered = state.items.filter((item) => item.id !== notification.id);

      return {
        items: [notification, ...filtered],
      };
    }),

  markNotificationReadLocal: (id) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item
      );

      const unreadCount = items.filter((n) => !n.readAt).length;

      return { items, unreadCount };
    }),

  markAllReadLocal: () =>
    set((state) => ({
      unreadCount: 0,
      items: state.items.map((item) => ({
        ...item,
        isRead: true,
      })),
    })),

  reset: () => {
    resetThrottle(UNREAD_KEY);
    set({
      unreadCount: 0,
      items: [],
    });
  },
}));
