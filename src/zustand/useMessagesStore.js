import { create } from 'zustand';
import { conversationsApi } from '../services/conversationsApi';

const SOUND_PREF_KEY = 'meyou_messages_sound_enabled';

function readSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (raw === 'false') return false;
  } catch {
    /* ignore */
  }
  return true;
}

export const useMessagesStore = create((set, get) => ({
  totalUnreadCount: 0,
  activeConversationId: null,
  soundEnabled: readSoundEnabled(),

  setActiveConversationId: (conversationId) =>
    set({ activeConversationId: conversationId || null }),

  setTotalUnreadCount: (count) =>
    set({ totalUnreadCount: Math.max(0, Number(count) || 0) }),

  setSoundEnabled: (enabled) => {
    try {
      localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
    set({ soundEnabled: Boolean(enabled) });
  },

  fetchTotalUnreadCount: async () => {
    try {
      const data = await conversationsApi.getUnreadCount();
      set({ totalUnreadCount: Math.max(0, data?.count ?? 0) });
    } catch (e) {
      console.error('[messages] fetch unread count failed', e);
    }
  },

  applyMessageCreated: ({ conversationId, unreadCount, totalUnreadCount }) => {
    if (typeof totalUnreadCount === 'number') {
      set({ totalUnreadCount: Math.max(0, totalUnreadCount) });
    } else if (typeof unreadCount === 'number') {
      set((state) => ({
        totalUnreadCount: Math.max(0, state.totalUnreadCount + 1),
      }));
    }
    void conversationId;
  },

  applyConversationRead: ({ totalUnreadCount }) => {
    if (typeof totalUnreadCount === 'number') {
      set({ totalUnreadCount: Math.max(0, totalUnreadCount) });
    }
  },

  reset: () =>
    set({
      totalUnreadCount: 0,
      activeConversationId: null,
    }),
}));
