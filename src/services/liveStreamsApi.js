import { api, apiPath } from "./api";

function unwrap(payload) {
  return payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
}

function extractItems(payload) {
  let value = payload;
  for (let depth = 0; depth < 5 && value; depth += 1) {
    if (Array.isArray(value)) return value;

    for (const key of ["items", "messages", "streams", "results", "rows", "records"]) {
      if (Array.isArray(value?.[key])) return value[key];
    }

    if (Array.isArray(value?.data)) return value.data;
    if (value?.data && typeof value.data === "object") {
      value = value.data;
      continue;
    }
    if (value?.result && typeof value.result === "object") {
      value = value.result;
      continue;
    }
    break;
  }
  return [];
}

export function extractLiveMedia(payload) {
  const value = unwrap(payload);
  return value?.media || value?.liveKit || value?.livekit || null;
}

export const liveStreamsApi = {
  async create(payload = {}) {
    const { data } = await api.post(apiPath("/live-streams"), payload);
    return unwrap(data);
  },

  async listActive() {
    const { data } = await api.get(apiPath("/live-streams/active"));
    return extractItems(data);
  },

  async listByUsername(username) {
    const { data } = await api.get(
      apiPath(`/live-streams/user/${encodeURIComponent(username)}`),
    );
    return extractItems(data);
  },

  async getById(id) {
    const { data } = await api.get(
      apiPath(`/live-streams/${encodeURIComponent(id)}`),
    );
    return unwrap(data);
  },

  async start(id) {
    const { data } = await api.post(
      apiPath(`/live-streams/${encodeURIComponent(id)}/start`),
    );
    return unwrap(data);
  },

  async getJoinToken(id) {
    const { data } = await api.post(
      apiPath(`/live-streams/${encodeURIComponent(id)}/join-token`),
    );
    return unwrap(data);
  },

  async end(id, payload = {}) {
    const { data } = await api.post(
      apiPath(`/live-streams/${encodeURIComponent(id)}/end`),
      payload,
    );
    return unwrap(data);
  },

  async updateSettings(id, payload) {
    const { data } = await api.patch(
      apiPath(`/live-streams/${encodeURIComponent(id)}/settings`),
      payload,
    );
    return unwrap(data);
  },

  async getMessages(id, { limit = 50, cursor } = {}) {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    const { data } = await api.get(
      apiPath(`/live-streams/${encodeURIComponent(id)}/messages`),
      { params },
    );
    return {
      items: extractItems(data),
      nextCursor:
        data?.nextCursor || data?.meta?.nextCursor || data?.data?.nextCursor || null,
    };
  },

  async deleteMessage(id, messageId) {
    const { data } = await api.delete(
      apiPath(
        `/live-streams/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}`,
      ),
    );
    return unwrap(data);
  },

  async tagUsers(id, userIds) {
    const { data } = await api.post(
      apiPath(`/live-streams/${encodeURIComponent(id)}/tagged-users`),
      { userIds },
    );
    return unwrap(data);
  },

  async untagUser(id, userId) {
    const { data } = await api.delete(
      apiPath(
        `/live-streams/${encodeURIComponent(id)}/tagged-users/${encodeURIComponent(userId)}`,
      ),
    );
    return unwrap(data);
  },

  async share(id, recipientIds = []) {
    const { data } = await api.post(
      apiPath(`/live-streams/${encodeURIComponent(id)}/share`),
      { recipientIds },
    );
    return unwrap(data);
  },

  async getPlayback(id) {
    const { data } = await api.get(
      apiPath(`/live-streams/${encodeURIComponent(id)}/playback`),
    );
    return unwrap(data);
  },
};
