import { mergeMessageHistory, messageSortKey } from './messageHistory';

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
 * @deprecated Prefer reconcileThreadWithLatestPage for background sync (authoritative tail).
 */
export function mergeThreadWithLatestPage(cachedMessages, latestPageItems) {
  return mergeMessageHistory(cachedMessages || [], latestPageItems || []);
}

/**
 * Background sync: server latest page is authoritative for the "tail" window.
 * Older scrolled-up prefix is kept; deletes-for-me / omitted server rows drop from tail.
 */
export function reconcileThreadWithLatestPage(cachedMessages, latestPageItems) {
  const cached = Array.isArray(cachedMessages) ? cachedMessages : [];
  const latest = Array.isArray(latestPageItems) ? latestPageItems : [];
  if (!latest.length) return [];
  const oldestLatest = latest[0];
  const oldestKey = messageSortKey(oldestLatest);
  const prefix = cached.filter((m) => {
    const key = messageSortKey(m);
    if (key[0] < oldestKey[0]) return true;
    if (key[0] > oldestKey[0]) return false;
    return key[1].localeCompare(oldestKey[1]) < 0;
  });
  return mergeMessageHistory(prefix, latest);
}

export function createEmptyInboxCache() {
  return { ...EMPTY_INBOX, conversations: [] };
}