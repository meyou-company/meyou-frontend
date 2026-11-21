import { create } from 'zustand';
import {
  MessengerThreadCache,
  createEmptyInboxCache,
  trimThreadMessages,
} from '../utils/messengerCache';

const threadCache = new MessengerThreadCache();

export const useMessengerCacheStore = create((set, get) => ({
  cacheUserId: null,
  inbox: createEmptyInboxCache(),

  bindUser: (userId) => {
    const uid = userId ? String(userId) : null;
    if (!uid) return;
    if (get().cacheUserId && get().cacheUserId !== uid) {
      threadCache.clear();
      set({ cacheUserId: uid, inbox: createEmptyInboxCache() });
      return;
    }
    set({ cacheUserId: uid });
  },

  getInboxSnapshot: () => {
    const { inbox } = get();
    return {
      conversations: [...(inbox.conversations || [])],
      listHasMore: Boolean(inbox.listHasMore),
      listNextCursor: inbox.listNextCursor ?? null,
      syncedAt: inbox.syncedAt || 0,
    };
  },

  setInboxSnapshot: ({ conversations, listHasMore, listNextCursor }) => {
    set({
      inbox: {
        conversations: Array.isArray(conversations) ? [...conversations] : [],
        listHasMore: Boolean(listHasMore),
        listNextCursor: listNextCursor ?? null,
        syncedAt: Date.now(),
      },
    });
  },

  patchInboxConversations: (updater) => {
    set((state) => {
      const next =
        typeof updater === 'function'
          ? updater(state.inbox.conversations || [])
          : updater;
      return {
        inbox: {
          ...state.inbox,
          conversations: Array.isArray(next) ? [...next] : [],
          syncedAt: Date.now(),
        },
      };
    });
  },

  getThread: (conversationId) => {
    if (!conversationId) return null;
    return threadCache.get(conversationId);
  },

  getBoundUserId: () => get().cacheUserId,

  updateThreadMessages: (conversationId, updater) => {
    if (!conversationId) return;
    const key = String(conversationId);
    const row = threadCache.get(key);
    if (!row) return;
    const base = row.messages || [];
    const next =
      typeof updater === 'function'
        ? updater(base)
        : Array.isArray(updater)
          ? updater
          : base;
    threadCache.set(key, {
      ...row,
      messages: trimThreadMessages(next),
      syncedAt: Date.now(),
    });
  },

  saveThread: (conversationId, payload) => {
    if (!conversationId) return;
    threadCache.set(String(conversationId), {
      conversationId: String(conversationId),
      messages: trimThreadMessages(payload.messages),
      hasMoreOlder: Boolean(payload.hasMoreOlder),
      olderCursor: payload.olderCursor ?? null,
      syncedAt: Date.now(),
    });
  },

  removeThread: (conversationId) => {
    threadCache.remove(conversationId);
  },

  reset: () => {
    threadCache.clear();
    set({ cacheUserId: null, inbox: createEmptyInboxCache() });
  },
}));