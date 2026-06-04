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

  addNotification: (notification) =>
    set((state) => {
      console.log('BEFORE:', state.unreadCount);

      return {
        items: [notification, ...state.items],
        unreadCount: state.unreadCount + 1,
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
