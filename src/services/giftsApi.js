import { api } from './api';

function unwrap(res) {
  return res?.data ?? res;
}

export const giftsApi = {
  getCatalog() {
    return api.get('/gifts/catalog').then(unwrap);
  },

  getReceived({ cursor, take } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (take != null) params.set('take', String(take));
    const qs = params.toString();
    return api.get(`/gifts/received${qs ? `?${qs}` : ''}`).then(unwrap);
  },

  getSent({ cursor, take } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (take != null) params.set('take', String(take));
    const qs = params.toString();
    return api.get(`/gifts/sent${qs ? `?${qs}` : ''}`).then(unwrap);
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
