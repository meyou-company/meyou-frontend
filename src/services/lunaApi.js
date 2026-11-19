import { api, apiPath } from "./api";

export const lunaApi = {
  async getSession(conversationId) {
    const { data } = await api.get(apiPath("/luna"), {
      params: conversationId ? { conversationId } : undefined,
    });
    return data;
  },

  async setAppearance(appearance, conversationId) {
    const { data } = await api.patch(apiPath("/luna/appearance"), {
      appearance,
      ...(conversationId ? { conversationId } : {}),
    });
    return data;
  },

  async createConversation() {
    const { data } = await api.post(apiPath("/luna/conversations"));
    return data;
  },

  async getConversation(id) {
    const { data } = await api.get(apiPath(`/luna/conversations/${id}`));
    return data;
  },

  async clearConversation(id) {
    const { data } = await api.delete(apiPath(`/luna/conversations/${id}/messages`));
    return data;
  },

  async deleteConversation(id) {
    const { data } = await api.delete(apiPath(`/luna/conversations/${id}`));
    return data;
  },

  async searchConversation(id, q) {
    const { data } = await api.get(apiPath(`/luna/conversations/${id}/messages`), {
      params: q ? { q } : undefined,
    });
    return data;
  },

  async sendMessage({ text, clientNonce, imageFile, conversationId }) {
    if (imageFile) {
      const body = new FormData();
      if (text) body.append("text", text);
      if (clientNonce) body.append("clientNonce", clientNonce);
      if (conversationId) body.append("conversationId", conversationId);
      body.append("image", imageFile);
      const { data } = await api.post(apiPath("/luna/messages"), body, {
        timeout: 60000,
      });
      return data;
    }
    const { data } = await api.post(apiPath("/luna/messages"), {
      text,
      clientNonce,
      ...(conversationId ? { conversationId } : {}),
    });
    return data;
  },

  async transcribe({ audioFile, durationSeconds }) {
    const body = new FormData();
    body.append("audio", audioFile);
    if (durationSeconds) body.append("durationSeconds", String(durationSeconds));
    const { data } = await api.post(apiPath("/luna/transcribe"), body, {
      timeout: 60000,
    });
    return data;
  },
};
