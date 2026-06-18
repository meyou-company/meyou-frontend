import { api, apiPath } from './api';

function extractList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.authors)) return payload.authors;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.groups)) return payload.groups;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.authors)) return payload.data.authors;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.groups)) return payload.data.groups;
  if (Array.isArray(payload.stories)) return payload.stories;
  if (Array.isArray(payload.data?.stories)) return payload.data.stories;
  return [];
}

function normalizePagedResponse(payload, fallbackLimit = 20) {
  const data = extractList(payload);
  const meta = payload?.meta || payload?.data?.meta || {};

  return {
    data,
    meta: {
      limit: meta.limit ?? payload?.limit ?? fallbackLimit,
      page: meta.page ?? payload?.page ?? 1,
      total: meta.total ?? payload?.total ?? data.length,
      hasMore: Boolean(meta.hasMore ?? payload?.hasMore),
      nextCursor: meta.nextCursor ?? payload?.nextCursor ?? null,
    },
  };
}

export const storiesApi = {
  async getFeed() {
    const { data } = await api.get(apiPath('/stories/feed'));
    return extractList(data);
  },

  async getUserStories(userId) {
    if (!userId) return [];

    const { data } = await api.get(apiPath(`/stories/${encodeURIComponent(userId)}`));

    return extractList(data);
  },

  async create({ mediaUrl, mediaType, text = '', visibility = 'FOLLOWERS', durationSec }) {
    const payload = {
      mediaUrl,
      mediaType,
      visibility,
    };

    const trimmedText = String(text ?? '').trim();

    if (trimmedText) {
      payload.text = trimmedText;
    }

    if (durationSec) {
      payload.durationSec = durationSec;
    }

    const { data } = await api.post(apiPath('/stories'), payload);
    return data;
  },

  async markViewed(storyId) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/view`));
    return data;
  },

  async deleteStory(storyId) {
    const { data } = await api.delete(apiPath(`/stories/${encodeURIComponent(storyId)}`));
    return data;
  },

  async getViews(storyId) {
    const { data } = await api.get(apiPath(`/stories/${encodeURIComponent(storyId)}/views`));
    return data;
  },

  async getAnalytics(storyId) {
    const { data } = await api.get(apiPath(`/stories/${encodeURIComponent(storyId)}/analytics`));
    return data;
  },

  async getArchive({ page = 1, limit = 20, cursor } = {}) {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    else params.page = page;

    const { data } = await api.get(apiPath('/stories/archive'), { params });
    return normalizePagedResponse(data, limit);
  },

  async getSaved({ page = 1, limit = 20, cursor } = {}) {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    else params.page = page;

    const { data } = await api.get(apiPath('/stories/saved'), { params });
    return normalizePagedResponse(data, limit);
  },

  async saveStory(storyId) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/save`));
    return data;
  },

  async unsaveStory(storyId) {
    const { data } = await api.delete(apiPath(`/stories/${encodeURIComponent(storyId)}/save`));
    return data;
  },

  async getPresignedUrl(file, { durationSec } = {}) {
    const fileName = file?.name || `story-${Date.now()}`;
    const fileType = file?.type || 'application/octet-stream';

    const params = {
      fileName,
      fileType,
    };

    if (typeof durationSec === 'number' && durationSec > 0) {
      params.clientDurationSec = durationSec;
    }

    const { data } = await api.get(apiPath('/uploads/story-media/presigned-url'), {
      params,
    });

    return data;
  },

  async setReaction(storyId, reactionType) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/reactions`), {
      reactionType,
    });

    return data;
  },

  async deleteReaction(storyId) {
    const { data } = await api.delete(apiPath(`/stories/${encodeURIComponent(storyId)}/reactions`));

    return data;
  },

  async reply(storyId, text) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/reply`), {
      text,
    });

    return data;
  },

  async muteAuthor(authorId) {
    const { data } = await api.post(apiPath(`/stories/authors/${encodeURIComponent(authorId)}/mute`));
    return data;
  },

  async unmuteAuthor(authorId) {
    const { data } = await api.delete(apiPath(`/stories/authors/${encodeURIComponent(authorId)}/mute`));
    return data;
  },

  async markInteresting(storyId) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/interesting`));
    return data;
  },

  async markNotInteresting(storyId) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/not-interesting`));
    return data;
  },

  async reportStory(storyId, reason) {
    const { data } = await api.post(apiPath(`/stories/${encodeURIComponent(storyId)}/report`), {
      reason,
    });
    return data;
  },
};
