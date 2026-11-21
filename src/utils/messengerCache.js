import { mergeMessageHistory } from './messageHistory';

export const MESSENGER_THREAD_CACHE_MAX = 10;
export const MESSENGER_MESSAGES_CACHE_MAX = 200;
export const MESSENGER_INITIAL_MESSAGE_LIMIT = 20;

const EMPTY_INBOX = {
  conversations: [],
  listHasMore: false,
  listNextCursor: null,
  syncedAt: 0,
};

/**
 * LRU thread cache keyed by conversationId (in-memory only).
 */
export class MessengerThreadCache {
  constructor(maxThreads = MESSENGER_THREAD_CACHE_MAX) {
    this.maxThreads = maxThreads;
    /** @type {Map<string, object>} */
    this.map = new Map();
  }

  /** @param {string} conversationId */
  get(conversationId) {
    const key = String(conversationId);
    const row = this.map.get(key);
    if (!row) return null;
    this.map.delete(key);
    this.map.set(key, row);
    return { ...row };
  }

  /**
   * @param {string} conversationId
   * @param {object} entry
   */
  set(conversationId, entry) {
    const key = String(conversationId);
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, {
      ...entry,
      messages: trimThreadMessages(entry.messages || []),
      syncedAt: entry.syncedAt ?? Date.now(),
    });
    while (this.map.size > this.maxThreads) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  /** @param {string} conversationId */
  remove(conversationId) {
    this.map.delete(String(conversationId));
  }

  clear() {
    this.map.clear();
  }
}

export function trimThreadMessages(messages, max = MESSENGER_MESSAGES_CACHE_MAX) {
  if (!Array.isArray(messages) || messages.length <= max) return messages || [];
  return messages.slice(-max);
}

export function mergeInboxHeadRefresh(prevConversations, freshItems) {
  const fresh = Array.isArray(freshItems) ? freshItems : [];
  const freshIds = new Set(fresh.map((c) => String(c.id)));
  const tail = (prevConversations || []).filter((c) => !freshIds.has(String(c.id)));
  return [...fresh, ...tail];
}

/**
 * Merge latest server page into cached thread without dropping scrolled-up history.
 */
export function mergeThreadWithLatestPage(cachedMessages, latestPageItems) {
  return mergeMessageHistory(cachedMessages || [], latestPageItems || []);
}

export function createEmptyInboxCache() {
  return { ...EMPTY_INBOX, conversations: [] };
}