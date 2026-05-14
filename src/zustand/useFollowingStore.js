import { create } from 'zustand';
import { subscriptionsApi } from '../services/subscriptionsApi';

export const useFollowingStore = create((set, get) => ({
  following: [],
  loading: false,

  // 🔥 отримати список
  fetchFollowing: async () => {
    set({ loading: true });

    try {
      const res = await subscriptionsApi.getFollowing({ take: 50 });
      const data = res?.data ?? res;

      set({ following: data?.items ?? [] });
    } catch (e) {
      console.error('fetchFollowing error', e);
      set({ following: [] });
    } finally {
      set({ loading: false });
    }
  },

  // 🔥 перевірка
  isFollowing: (userId) => {
    return get().following.some((u) => u.id === userId);
  },

  // 🔥 підписка
  follow: async (userId) => {
    try {
      await subscriptionsApi.subscribe(userId);
      await get().fetchFollowing();
    } catch (e) {
      if (e.response?.status === 409) {
        // вже підписана → просто синхронізація
        await get().fetchFollowing();
      } else {
        console.error(e);
      }
    }
  },

  // 🔥 відписка
  unfollow: async (userId) => {
    try {
      await subscriptionsApi.unsubscribe(userId);
      await get().fetchFollowing();
    } catch (e) {
      console.error(e);
    }
  },
}));
