import { api } from './api';

function unwrap(res) {
  return res?.data ?? res;
}

export const giftsApi = {
  getCatalog() {
    return api.get('/gifts/catalog').then(unwrap);
  },

  getReceived() {
    return api.get('/gifts/received').then(unwrap);
  },

  getSent() {
    return api.get('/gifts/sent').then(unwrap);
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
