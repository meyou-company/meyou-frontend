import { api, apiPath } from "./api";

function extractList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export const videosApi = {
  async list({ page = 1, limit = 12, tab = "recommended", search, sort } = {}) {
    const params = { page, limit, tab };
    if (search?.trim()) params.search = search.trim();
    if (sort) params.sort = sort;

    const { data } = await api.get(apiPath("/videos"), { params });

    return {
      items: extractList(data),
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
      total: data?.total ?? extractList(data).length,
    };
  },

  async getById(id) {
    const { data } = await api.get(apiPath(`/videos/${encodeURIComponent(id)}`));
    return data;
  },

  async create(payload) {
    const { data } = await api.post(apiPath("/videos"), payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(
      apiPath(`/videos/${encodeURIComponent(id)}`),
      payload,
    );
    return data;
  },

  async delete(id) {
    await api.delete(apiPath(`/videos/${encodeURIComponent(id)}`));
  },

  async like(id) {
    const { data } = await api.post(
      apiPath(`/videos/${encodeURIComponent(id)}/like`),
    );
    return data;
  },

  async unlike(id) {
    const { data } = await api.delete(
      apiPath(`/videos/${encodeURIComponent(id)}/like`),
    );
    return data;
  },

  async save(id) {
    const { data } = await api.post(
      apiPath(`/videos/${encodeURIComponent(id)}/save`),
    );
    return data;
  },

  async unsave(id) {
    const { data } = await api.delete(
      apiPath(`/videos/${encodeURIComponent(id)}/save`),
    );
    return data;
  },

  async registerView(id) {
    const { data } = await api.post(
      apiPath(`/videos/${encodeURIComponent(id)}/view`),
    );
    return data;
  },

  async getPresignedUrl(file, type) {
    const fileName = file?.name || `video-${Date.now()}`;
    const fileType = type || file?.type || "video/mp4";

    const { data } = await api.get(apiPath("/uploads/video-media/presigned-url"), {
      params: {
        fileName,
        fileType,
      },
    });

    return data;
  },
};
