import { api, apiPath } from './api';

export const feedbackApi = {
  async create(payload) {
    const { data } = await api.post(apiPath('/feedback'), payload);
    return data;
  },

  async listMine({ status, type, page = 1, limit = 20 } = {}) {
    const { data } = await api.get(apiPath('/feedback/me'), {
      params: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        page,
        limit,
      },
    });
    return data;
  },

  async unreadCount() {
    const { data } = await api.get(apiPath('/feedback/me/unread-count'));
    return data;
  },

  async getMine(feedbackId) {
    const { data } = await api.get(
      apiPath(`/feedback/${encodeURIComponent(feedbackId)}`),
    );
    return data;
  },

  async markRead(feedbackId) {
    const { data } = await api.post(
      apiPath(`/feedback/${encodeURIComponent(feedbackId)}/read`),
    );
    return data;
  },
};
