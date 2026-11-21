import { api, apiPath } from './api';
import { sendMessageBodyForLegacyApi } from '../utils/sendMessageLegacyBody';

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

  async list({ limit, cursor, q } = {}) {
    const params = {};
    if (limit != null) params.limit = limit;
    if (cursor) params.cursor = cursor;
    if (q && String(q).trim()) params.q = String(q).trim();
    const paginated = Object.keys(params).length > 0;
    const { data } = await api.get(apiPath('/conversations'), {
      params: paginated ? params : undefined,
    });
    const items = extractList(data);
    if (!paginated && data?.hasMore == null && !data?.nextCursor) {
      return items;
    }
    return {
      items,
      nextCursor: data?.nextCursor ?? null,
      hasMore: Boolean(data?.hasMore),
    };
  },

  async listHidden() {
    const { data } = await api.get(apiPath('/conversations/hidden'));
    return extractList(data);
  },

  async unhideConversation(conversationId) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/unhide`),
    );
    return data;
  },

  async markConversationRead(conversationId, { readUpToMessageId } = {}) {
    const payload =
      readUpToMessageId && String(readUpToMessageId).trim()
        ? { readUpToMessageId: String(readUpToMessageId).trim() }
        : undefined;
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/read`),
      payload,
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

  async pinConversation(conversationId) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/pin`),
    );
    return data;
  },

  async markConversationUnread(conversationId) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/unread`),
    );
    return data;
  },

  async deleteConversationForMe(conversationId) {
    const { data } = await api.delete(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}`),
    );
    return data;
  },

  async create(participantId) {
    const { data } = await api.post(apiPath('/conversations'), { participantId });
    return data;
  },

  async createGroup({ name, avatarUrl, memberIds }) {
    const { data } = await api.post(apiPath('/conversations/groups'), {
      name,
      avatarUrl: avatarUrl || undefined,
      memberIds,
    });
    return data;
  },

  async getById(conversationId) {
    const { data } = await api.get(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}`),
    );
    return data;
  },

  async updateGroup(conversationId, payload) {
    const { data } = await api.patch(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}`),
      payload,
    );
    return data;
  },

  async addGroupMembers(conversationId, memberIds) {
    const { data } = await api.post(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/members`),
      { memberIds },
    );
    return data;
  },

  async removeGroupMember(conversationId, userId) {
    const { data } = await api.delete(
      apiPath(
        `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(userId)}`,
      ),
    );
    return data;
  },

  async updateGroupMemberRole(conversationId, userId, role) {
    const { data } = await api.patch(
      apiPath(
        `/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(userId)}`,
      ),
      { role },
    );
    return data;
  },

  async leaveGroup(conversationId) {
    const { data } = await api.post(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/leave`),
    );
    return data;
  },

  async deleteGroup(conversationId) {
    const { data } = await api.delete(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/group`),
    );
    return data;
  },

  async getMessages(conversationId, { before, limit = 40, page } = {}) {
    const params = { limit };
    if (before) params.before = before;
    if (page != null) params.page = page;

    const { data } = await api.get(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/messages`),
      { params },
    );
    const items = extractList(data);
    return {
      items,
      limit: data?.limit ?? limit,
      total: data?.total,
      page: data?.page,
      hasMoreOlder: Boolean(data?.hasMoreOlder),
      before: data?.before ?? null,
      paginationMode: data?.paginationMode,
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
    const path = apiPath(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
    );
    try {
      const { data } = await api.post(path, body);
      return data;
    } catch (err) {
      // Production still uses forbidNonWhitelisted. A newer frontend may send
      // `clientId` and `metadata` before that API is deployed. Retry once
      // without those fields; sticker IDs remain in `text` as ::lunmeyo:id::.
      if (err?.response?.status === 400) {
        const legacyBody = sendMessageBodyForLegacyApi(body);
        if (legacyBody) {
          const { data } = await api.post(path, legacyBody);
          return data;
        }
      }
      throw err;
    }
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
