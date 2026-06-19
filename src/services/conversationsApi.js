import { api, apiPath } from './api';

function extractList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export const conversationsApi = {
  async getUnreadCount() {
    const { data } = await api.get(apiPath('/conversations/unread-count'));
    return data;
  },

  async list() {
    const { data } = await api.get(apiPath('/conversations'));
    return extractList(data);
  },

  async markConversationRead(conversationId) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/read`),
    );
    return data;
  },

  async muteConversation(conversationId, mutedUntil = null) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/mute`),
      { mutedUntil },
    );
    return data;
  },

  async create(participantId) {
    const { data } = await api.post(apiPath('/conversations'), { participantId });
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

  async searchMessages(conversationId, { q, page = 1, limit = 30 } = {}) {
    const { data } = await api.get(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/messages/search`),
      { params: { q, page, limit } },
    );
    return {
      items: extractList(data),
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
      total: data?.total ?? extractList(data).length,
      q: data?.q ?? q,
    };
  },

  async sendMessage(conversationId, payload) {
    const body =
      typeof payload === 'string'
        ? { text: payload }
        : payload;
    const { data } = await api.post(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/messages`),
      body,
    );
    return data;
  },

  async markRead(messageId) {
    const { data } = await api.patch(
      apiPath(`/messages/${encodeURIComponent(messageId)}/read`),
    );
    return data;
  },

  async editMessage(messageId, text) {
    const { data } = await api.patch(
      apiPath(`/messages/${encodeURIComponent(messageId)}`),
      { text },
    );
    return data;
  },

  async deleteForMe(messageId) {
    const { data } = await api.delete(
      apiPath(`/messages/${encodeURIComponent(messageId)}/for-me`),
    );
    return data;
  },

  async deleteForEveryone(messageId) {
    const { data } = await api.delete(
      apiPath(`/messages/${encodeURIComponent(messageId)}/for-everyone`),
    );
    return data;
  },

  async forwardMessage(messageId, targetConversationId) {
    const { data } = await api.post(
      apiPath(`/messages/${encodeURIComponent(messageId)}/forward`),
      { targetConversationId },
    );
    return data;
  },

  async addReaction(messageId, reactionType) {
    const { data } = await api.post(
      apiPath(`/messages/${encodeURIComponent(messageId)}/reactions`),
      { reactionType },
    );
    return data;
  },

  async removeReaction(messageId) {
    const { data } = await api.delete(
      apiPath(`/messages/${encodeURIComponent(messageId)}/reactions`),
    );
    return data;
  },

  async pinMessage(messageId) {
    const { data } = await api.post(
      apiPath(`/messages/${encodeURIComponent(messageId)}/pin`),
    );
    return data;
  },

  async unpinMessage(messageId) {
    const { data } = await api.delete(
      apiPath(`/messages/${encodeURIComponent(messageId)}/pin`),
    );
    return data;
  },

  async translateMessage(messageId) {
    const { data } = await api.post(
      apiPath(`/messages/${encodeURIComponent(messageId)}/translate`),
    );
    return data;
  },

  async reportMessage(messageId, reason) {
    const { data } = await api.post(
      apiPath(`/messages/${encodeURIComponent(messageId)}/report`),
      { reason },
    );
    return data;
  },
};
