import { create } from 'zustand';
import { notificationsApi } from '../services/notificationsApi';

export const useNotificationsStore = create((set, get) => ({
  unreadCount: 0,
  items: [],
  isLoading: false,

  // отримати кількість з бекенду
  fetchUnreadCount: async () => {
    try {
      set({ isLoading: true });

      const data = await notificationsApi.getUnreadCount();

      set({ unreadCount: data.count });
    } catch (e) {
      console.error('FETCH UNREAD ERROR:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      get().markAllReadLocal();
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
      const skipUnreadBump = options.skipUnreadBump === true;
      const exists = state.items.some((item) => item.id === notification.id);
      if (exists) {
        return {
          items: state.items.map((item) =>
            item.id === notification.id ? notification : item,
          ),
        };
      }
      return {
        items: [notification, ...state.items],
        unreadCount: skipUnreadBump
          ? state.unreadCount
          : state.unreadCount + 1,
      };
    }),
  updateNotification: (notification) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === notification.id ? notification : item)),
    })),

  markNotificationReadLocal: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllReadLocal: () =>
    set((state) => ({
      unreadCount: 0,
      items: state.items.map((item) => ({
        ...item,
        isRead: true,
      })),
    })),

  reset: () =>
    set({
      unreadCount: 0,
      items: [],
    }),
}));
