import { create } from 'zustand';
import { conversationsApi } from '../services/conversationsApi';
import { resetThrottle, throttledDedupeAsync } from '../utils/throttledDedupeAsync';

const SOUND_PREF_KEY = 'meyou_messages_sound_enabled';
const UNREAD_KEY = 'messages:unread-count';
const UNREAD_THROTTLE_MS = 15000;

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

  fetchTotalUnreadCount: (force = false) =>
    throttledDedupeAsync(
      UNREAD_KEY,
      async () => {
        try {
          const data = await conversationsApi.getUnreadCount();
          set({ totalUnreadCount: Math.max(0, data?.count ?? 0) });
          return data;
        } catch (e) {
          console.error('[messages] fetch unread count failed', e);
        }
      },
      UNREAD_THROTTLE_MS,
      { force },
    ),

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

  reset: () => {
    resetThrottle(UNREAD_KEY);
    set({
      totalUnreadCount: 0,
      activeConversationId: null,
    });
  },
}));
