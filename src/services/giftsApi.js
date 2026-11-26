import { api } from './api';

function unwrap(res) {
  return res?.data ?? res;
}

/** Normalize legacy array or paginated envelope from GET /gifts/received|sent. */
export function normalizeGiftListResponse(body) {
  if (Array.isArray(body)) {
    return {
      items: body,
      hasMore: false,
      nextCursor: null,
    };
  }
  const items = Array.isArray(body?.items) ? body.items : [];
  return {
    items,
    hasMore: Boolean(body?.hasMore),
    nextCursor: body?.nextCursor ?? null,
  };
}

export const giftsApi = {
  getCatalog() {
    return api.get('/gifts/catalog').then(unwrap);
  },

  getReceived({ cursor, take, paginated = true } = {}) {
    const params = new URLSearchParams();
    if (paginated) params.set('paginated', '1');
    if (cursor) params.set('cursor', cursor);
    if (take != null) params.set('take', String(take));
    const qs = params.toString();
    return api
      .get(`/gifts/received${qs ? `?${qs}` : ''}`)
      .then(unwrap)
      .then(normalizeGiftListResponse);
  },

  getReceivedPending({ cursor, take, paginated = true } = {}) {
    const params = new URLSearchParams();
    if (paginated) params.set('paginated', '1');
    if (cursor) params.set('cursor', cursor);
    if (take != null) params.set('take', String(take));
    const qs = params.toString();
    return api
      .get(`/gifts/received/pending${qs ? `?${qs}` : ''}`)
      .then(unwrap)
      .then(normalizeGiftListResponse);
  },

  getSent({ cursor, take, paginated = true } = {}) {
    const params = new URLSearchParams();
    if (paginated) params.set('paginated', '1');
    if (cursor) params.set('cursor', cursor);
    if (take != null) params.set('take', String(take));
    const qs = params.toString();
    return api
      .get(`/gifts/sent${qs ? `?${qs}` : ''}`)
      .then(unwrap)
      .then(normalizeGiftListResponse);
  },

  getRecipient(userId) {
    return api.get(`/gifts/recipient/${encodeURIComponent(userId)}`).then(unwrap);
  },

  send({ giftId, receiverId }) {
    return api.post('/gifts', { giftId, receiverId }).then(unwrap);
  },

  open(giftSendId) {
    return api.post(`/gifts/${encodeURIComponent(giftSendId)}/open`).then(unwrap);
  },
};