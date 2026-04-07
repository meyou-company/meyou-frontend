import { api } from "./api";

function extractPostsList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.posts)) return payload.posts;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function extractCommentsList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.comments)) return payload.comments;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.comments)) return payload.data.comments;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  return [];
}

export const postsApi = {
  /**
   * Глобальна стрічка: усі пости, доступні поточному користувачу (visibility на бекенді).
   * Використовувати на first-page / home feed. НЕ для сторінки профілю.
   * GET /posts
   */
  async list({ page = 1, limit = 10 } = {}) {
    const { data } = await api.get("/posts", {
      params: { page, limit },
    });
    const list = extractPostsList(data);

    // Backend compatibility: some environments use 0-based paging.
    // If first page is empty, retry with page=0 once.
    if (Number(page) === 1 && list.length === 0) {
      const { data: dataZero } = await api.get("/posts", {
        params: { page: 0, limit },
      });
      const listZero = extractPostsList(dataZero);
      if (listZero.length > 0) return listZero;
    }

    return list;
  },

  /**
   * Пости одного автора (відкритий профіль).
   * Фільтрація по authorId = profileUserId — на бекенді.
   * GET /posts/users/:authorId/posts
   * Не плутати з list() (глобальна стрічка).
   */
  async listByAuthor(authorId) {
    if (!authorId) return [];
    const encodedId = encodeURIComponent(authorId);
    const candidates = [
      `/posts/users/${encodedId}/posts`,
      `/users/${encodedId}/posts`,
    ];

    let lastError;
    for (const url of candidates) {
      try {
        const { data } = await api.get(url);
        return extractPostsList(data);
      } catch (e) {
        const status = e?.response?.status;
        // If backend says "server error", do not mask it with another route.
        if (status >= 500) throw e;
        lastError = e;
      }
    }

    // Last-resort fallback: load global feed and filter by author on frontend.
    // This prevents empty profile feed when user-specific route is unavailable.
    try {
      const all = await this.list({ page: 1, limit: 100 });
      return (Array.isArray(all) ? all : []).filter(
        (p) => String(p?.author?.id ?? "") === String(authorId)
      );
    } catch {
      // keep original route error for diagnostics
      throw lastError;
    }
  },

  async create({
    fullText,
    media = [],
    location,
    originalPostId,
    visibility = "PUBLIC",
  }) {
    const payload = {
      fullText: fullText?.trim() || "",
      media: Array.isArray(media) ? media : [],
      location: location || undefined,
      originalPostId: originalPostId || undefined,
      visibility,
    };

    const { data } = await api.post("/posts", payload);
    return data;
  },

  /** POST /posts/:id/like */
  async like(postId) {
    const { data } = await api.post(
      `/posts/${encodeURIComponent(postId)}/like`
    );
    return data;
  },

  /** POST /posts/:id/comments — body { content: string } */
  async addComment(postId, content) {
    const { data } = await api.post(
      `/posts/${encodeURIComponent(postId)}/comments`,
      { content: String(content ?? "").trim() }
    );
    return data;
  },

  /** GET /posts/:id/comments — список коментарів (пагінація на бекенді) */
  async listComments(postId, { page = 1, limit = 50 } = {}) {
    const { data } = await api.get(
      `/posts/${encodeURIComponent(postId)}/comments`,
      { params: { page, limit } }
    );
    return extractCommentsList(data);
  },

  /** POST /posts/:id/repost */
  async repost(postId) {
    const { data } = await api.post(
      `/posts/${encodeURIComponent(postId)}/repost`
    );
    return data;
  },

  /** DELETE /posts/:id — лише для автора (перевірка на бекенді) */
  async deletePost(postId) {
    await api.delete(`/posts/${encodeURIComponent(postId)}`);
  },
};
