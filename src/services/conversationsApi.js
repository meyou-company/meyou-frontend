import { api, apiPath } from "./api";

function extractList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export const conversationsApi = {
  async getUnreadCount() {
    const { data } = await api.get(apiPath("/conversations/unread-count"));
    return data;
  },

  async list() {
    const { data } = await api.get(apiPath("/conversations"));
    return extractList(data);
  },

  async markConversationRead(conversationId) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/read`),
    );
    return data;
  },

  async create(participantId) {
    const { data } = await api.post(apiPath("/conversations"), { participantId });
    return data;
  },

  async getMessages(conversationId, { page = 1, limit = 50 } = {}) {
    const { data } = await api.get(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/messages`),
      { params: { page, limit } },
    );
    return {
      items: extractList(data),
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
      total: data?.total ?? extractList(data).length,
      unreadCount: data?.unreadCount,
      totalUnreadCount: data?.totalUnreadCount,
    };
  },

  async sendMessage(conversationId, text) {
    const { data } = await api.post(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/messages`),
      { text },
    );
    return data;
  },

  async markRead(messageId) {
    const { data } = await api.patch(
      apiPath(`/messages/${encodeURIComponent(messageId)}/read`),
    );
    return data;
  },
};
