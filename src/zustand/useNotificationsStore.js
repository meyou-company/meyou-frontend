import { create } from 'zustand';
import { notificationsApi } from '../services/notificationsApi';

export const useNotificationsStore = create((set, get) => ({
  unreadCount: 0,
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

  // обнулити локально (для UX)
  // clearUnreadLocal: () => set({ unreadCount: 0 }),

  // прочитати всі (бек + фронт)
  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set({ unreadCount: 0 });
    } catch (e) {
      console.error('MARK ALL READ ERROR:', e);
    }
  },

  // прочитати один
  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id);

      set((state) => ({
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (e) {
      console.error('MARK ONE READ ERROR:', e);
    }
  },

  // очистка при logout
  reset: () => set({ unreadCount: 0 }),
}));
