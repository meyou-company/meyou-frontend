import { fetchChatAttachmentDelivery } from '../services/chatMediaDeliveryApi';
import { dedupeAsync } from './dedupeAsync';

const MAX_CACHE_ENTRIES = 250;

/** @typedef {'idle' | 'loading' | 'ready' | 'error'} DeliveryStatus */

/**
 * @typedef {object} ChatDeliveryCacheEntry
 * @property {DeliveryStatus} status
 * @property {string | null} deliveryUrl
 * @property {number | null} refreshAt
 * @property {string | null} expiresAt
 * @property {boolean} cdnEnforcesExpiry
 * @property {string} [accessControl]
 * @property {{ status?: number; message?: string; nonRetryable?: boolean }} [error]
 */

const cache = new Map();
/** @type {Map<string, Set<(entry: ChatDeliveryCacheEntry) => void>>} */
const listeners = new Map();
let refreshTimer = null;
let evictionOrder = [];

export function makeChatDeliveryCacheKey(conversationId, attachmentId) {
  return `${conversationId}|${attachmentId}`;
}

export function clearChatMediaDeliveryCache() {
  cache.clear();
  listeners.clear();
  evictionOrder = [];
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function evictIfNeeded() {
  while (cache.size > MAX_CACHE_ENTRIES && evictionOrder.length > 0) {
    const oldest = evictionOrder.shift();
    if (oldest) cache.delete(oldest);
  }
}

function touchKey(key) {
  evictionOrder = evictionOrder.filter((k) => k !== key);
  evictionOrder.push(key);
}

function notify(key) {
  const entry = cache.get(key);
  if (!entry) return;
  listeners.get(key)?.forEach((fn) => {
    try {
      fn(entry);
    } catch {
      /* subscriber */
    }
  });
}

function parseApiError(err) {
  const status = err?.response?.status;
  const message =
    typeof err?.response?.data?.message === 'string'
      ? err.response.data.message
      : undefined;
  const nonRetryable = status === 403 || status === 404;
  return { status, message, nonRetryable };
}

function scheduleGlobalRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  let nextWake = Infinity;
  for (const entry of cache.values()) {
    if (
      entry.status === 'ready' &&
      entry.cdnEnforcesExpiry &&
      Number.isFinite(entry.refreshAt)
    ) {
      nextWake = Math.min(nextWake, entry.refreshAt);
    }
  }
  if (!Number.isFinite(nextWake)) return;

  const delay = Math.max(500, nextWake - Date.now());
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    for (const [key, entry] of cache.entries()) {
      if (
        entry.status === 'ready' &&
        entry.cdnEnforcesExpiry &&
        entry.refreshAt != null &&
        entry.refreshAt <= Date.now()
      ) {
        const [conversationId, attachmentId] = key.split('|');
        if (conversationId && attachmentId) {
          void loadChatAttachmentDelivery(conversationId, attachmentId, {
            force: true,
            reason: 'scheduled',
          }).catch(() => {});
        }
      }
    }
    scheduleGlobalRefresh();
  }, delay);
}

/**
 * @param {string} conversationId
 * @param {string} attachmentId
 * @param {{ force?: boolean; reason?: string }} [options]
 */
export async function loadChatAttachmentDelivery(
  conversationId,
  attachmentId,
  options = {},
) {
  const { force = false } = options;
  const key = makeChatDeliveryCacheKey(conversationId, attachmentId);
  const cached = cache.get(key);
  if (
    !force &&
    cached?.status === 'ready' &&
    cached.deliveryUrl &&
    (!cached.cdnEnforcesExpiry ||
      (cached.refreshAt != null && cached.refreshAt > Date.now()))
  ) {
    return cached;
  }

  if (
    !force &&
    cached?.status === 'error' &&
    cached.error?.nonRetryable
  ) {
    return cached;
  }

  return dedupeAsync(`chat-delivery:${key}`, async () => {
    const loadingEntry = {
      status: 'loading',
      deliveryUrl: cached?.deliveryUrl ?? null,
      refreshAt: cached?.refreshAt ?? null,
      expiresAt: cached?.expiresAt ?? null,
      cdnEnforcesExpiry: Boolean(cached?.cdnEnforcesExpiry),
    };
    cache.set(key, loadingEntry);
    touchKey(key);
    notify(key);

    try {
      const data = await fetchChatAttachmentDelivery(conversationId, attachmentId);
      const refreshMs = Math.max(
        30,
        Number(data.refreshAfterSeconds) || Number(data.expiresInSeconds) * 0.8 || 240,
      ) * 1000;
      const entry = {
        status: 'ready',
        deliveryUrl: data.deliveryUrl,
        expiresAt: data.expiresAt ?? null,
        refreshAt: Date.now() + refreshMs,
        cdnEnforcesExpiry: Boolean(data.cdnEnforcesExpiry),
        accessControl: data.accessControl,
      };
      cache.set(key, entry);
      touchKey(key);
      evictIfNeeded();
      notify(key);
      scheduleGlobalRefresh();
      return entry;
    } catch (err) {
      const parsed = parseApiError(err);
      const entry = {
        status: 'error',
        deliveryUrl: null,
        refreshAt: null,
        expiresAt: null,
        cdnEnforcesExpiry: false,
        error: parsed,
      };
      cache.set(key, entry);
      touchKey(key);
      notify(key);
      return entry;
    }
  });
}

export function getChatDeliveryCacheEntry(conversationId, attachmentId) {
  return cache.get(makeChatDeliveryCacheKey(conversationId, attachmentId)) ?? null;
}

/**
 * @param {string} conversationId
 * @param {string} attachmentId
 * @param {(entry: ChatDeliveryCacheEntry) => void} listener
 * @returns {() => void}
 */
export function subscribeChatDelivery(conversationId, attachmentId, listener) {
  const key = makeChatDeliveryCacheKey(conversationId, attachmentId);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(listener);

  const current = cache.get(key);
  if (current) listener(current);

  return () => {
    listeners.get(key)?.delete(listener);
    if (listeners.get(key)?.size === 0) listeners.delete(key);
  };
}

/** Test helper: number of scheduled refresh listeners. */
export function __testGetCacheSize() {
  return cache.size;
}