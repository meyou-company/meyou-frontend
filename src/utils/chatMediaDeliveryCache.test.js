import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('../services/chatMediaDeliveryApi.js', () => ({
  fetchChatAttachmentDelivery: (...args) => fetchMock(...args),
}));

import {
  __testHasRefreshTimer,
  __testListenerCount,
  __testRefreshExpiredEntries,
  __testRunRefreshTimer,
  clearChatMediaDeliveryCache,
  getChatDeliveryCacheEntry,
  loadChatAttachmentDelivery,
  makeChatDeliveryCacheKey,
  setChatMediaDeliveryScope,
  subscribeChatDelivery,
} from './chatMediaDeliveryCache.js';

const convA = '11111111-1111-4111-8111-111111111111';
const convB = '99999999-9999-4999-8999-999999999999';
const att1 = '22222222-2222-4222-8222-222222222222';
const att2 = '33333333-3333-4333-8333-333333333333';

const successPayload = {
  deliveryUrl: 'https://res.cloudinary.com/demo/image/upload/x.jpg?__cld_token__=abc',
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  expiresInSeconds: 300,
  refreshAfterSeconds: 2,
  accessControl: 'auth_token',
  cdnEnforcesExpiry: true,
};

describe('chatMediaDeliveryCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearChatMediaDeliveryCache();
    setChatMediaDeliveryScope('test-user');
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(successPayload);
  });

  afterEach(() => {
    clearChatMediaDeliveryCache();
    vi.useRealTimers();
  });

  it('loads delivery URL from API', async () => {
    const entry = await loadChatAttachmentDelivery(convA, att1);
    expect(entry.status).toBe('ready');
    expect(entry.deliveryUrl).toContain('__cld_token__');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(convA, att1);
  });

  it('deduplicates parallel loads for the same attachment', async () => {
    await Promise.all([
      loadChatAttachmentDelivery(convA, att1),
      loadChatAttachmentDelivery(convA, att1),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves cache on reopen without refetch until refreshAt', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    fetchMock.mockClear();
    const cached = await loadChatAttachmentDelivery(convA, att1);
    expect(cached.status).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('schedules auto-refresh and refetches after refreshAfterSeconds', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    expect(__testHasRefreshTimer()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockClear();

    const cached = getChatDeliveryCacheEntry(convA, att1);
    cached.refreshAt = Date.now() - 1;
    await __testRefreshExpiredEntries();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(convA, att1);
  });

  it('stores 403 without deliveryUrl and does not refetch automatically', async () => {
    fetchMock.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Forbidden' } },
    });
    const entry = await loadChatAttachmentDelivery(convA, att1);
    expect(entry.status).toBe('error');
    expect(entry.deliveryUrl).toBeNull();
    expect(entry.error?.nonRetryable).toBe(true);
    fetchMock.mockClear();
    await loadChatAttachmentDelivery(convA, att1);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('stores 404 without deliveryUrl and does not refetch automatically', async () => {
    fetchMock.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Attachment not found' } },
    });
    const entry = await loadChatAttachmentDelivery(convA, att1);
    expect(entry.status).toBe('error');
    expect(entry.deliveryUrl).toBeNull();
    expect(entry.error?.nonRetryable).toBe(true);

    fetchMock.mockClear();
    const again = await loadChatAttachmentDelivery(convA, att1);
    expect(again.status).toBe('error');
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('stores 503 without deliveryUrl (no MAC) and allows manual force retry', async () => {
    fetchMock.mockRejectedValueOnce({
      response: { status: 503, data: { message: 'Chat private media delivery is not enabled' } },
    });
    const entry = await loadChatAttachmentDelivery(convA, att1);
    expect(entry.status).toBe('error');
    expect(entry.deliveryUrl).toBeNull();
    expect(entry.error?.status).toBe(503);
    expect(entry.error?.nonRetryable).toBe(false);

    fetchMock.mockResolvedValueOnce(successPayload);
    await loadChatAttachmentDelivery(convA, att1, { force: true });
    expect(getChatDeliveryCacheEntry(convA, att1)?.status).toBe('ready');
  });

  it('treats forwarded attachment in another chat as a separate cache key', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    fetchMock.mockClear();
    await loadChatAttachmentDelivery(convB, att1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(convB, att1);
  });

  it('clears cache and timers on logout helper', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    expect(__testHasRefreshTimer()).toBe(true);
    clearChatMediaDeliveryCache();
    expect(__testHasRefreshTimer()).toBe(false);
    expect(getChatDeliveryCacheEntry(convA, att1)).toBeNull();
  });

  it('does not leak delivery entries across account scope changes', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    setChatMediaDeliveryScope('user-b');
    expect(getChatDeliveryCacheEntry(convA, att1)).toBeNull();
    fetchMock.mockClear();
    await loadChatAttachmentDelivery(convA, att1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe removes listeners without leaking', async () => {
    const fn = vi.fn();
    const unsub = subscribeChatDelivery(convA, att1, fn);
    expect(__testListenerCount()).toBe(1);
    unsub();
    expect(__testListenerCount()).toBe(0);
  });

  it('force refresh after expiry window refetches once', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    const key = makeChatDeliveryCacheKey(convA, att1);
    const entry = getChatDeliveryCacheEntry(convA, att1);
    entry.refreshAt = Date.now() - 1;
    void key;
    fetchMock.mockClear();
    await loadChatAttachmentDelivery(convA, att1, { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('limits 404 refetch loops without manual force', async () => {
    fetchMock.mockRejectedValue({
      response: { status: 404, data: { message: 'nope' } },
    });
    await loadChatAttachmentDelivery(convA, att1);
    await loadChatAttachmentDelivery(convA, att1);
    await loadChatAttachmentDelivery(convA, att1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('distinct attachments in same chat use separate keys', async () => {
    await loadChatAttachmentDelivery(convA, att1);
    fetchMock.mockClear();
    await loadChatAttachmentDelivery(convA, att2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});