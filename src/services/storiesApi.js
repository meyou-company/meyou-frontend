import { api, apiPath } from "./api";

function extractList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.stories)) return payload.stories;
  return [];
}

export const storiesApi = {
  async getFeed() {
    const { data } = await api.get(apiPath("/stories/feed"));
    return extractList(data);
  },

  async getUserStories(username) {
    if (!username) return [];
    const { data } = await api.get(
      apiPath(`/users/${encodeURIComponent(username)}/stories`)
    );
    return extractList(data);
  },

  async create({ mediaUrl, mediaType, text = "" }) {
  const payload = {
    mediaUrl,
    mediaType,
  };

  const trimmedText = String(text ?? "").trim();

  if (trimmedText) {
    payload.text = trimmedText;
  }

  console.log("[create-story-payload]", payload);

  const { data } = await api.post(apiPath("/stories"), payload);
  return data;
},

  async markViewed(storyId) {
    const { data } = await api.post(
      apiPath(`/stories/${encodeURIComponent(storyId)}/view`)
    );
    return data;
  },

  async deleteStory(storyId) {
    const { data } = await api.delete(
      apiPath(`/stories/${encodeURIComponent(storyId)}`)
    );
    return data;
  },

  async getViews(storyId) {
    const { data } = await api.get(
      apiPath(`/stories/${encodeURIComponent(storyId)}/views`)
    );
    return data;
  },

  async getPresignedUrl(file) {
    const fileName = file?.name || `story-${Date.now()}`;
    const fileType = file?.type || "application/octet-stream";

    const { data } = await api.get(apiPath("/uploads/story-media/presigned-url"), {
      params: {
        fileName,
        fileType,
      },
    });

    return data;
  },
};