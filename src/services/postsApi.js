import { api } from "./api";

function extractPostsList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.posts)) return payload.posts;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export const postsApi = {
  /**
   * Глобальна стрічка: усі пости, доступні поточному користувачу (visibility на бекенді).
   * Використовувати на first-page / home feed. НЕ для сторінки профілю.
   * GET /posts
   */
  async list() {
    const { data } = await api.get("/posts");
    return extractPostsList(data);
  },

  /**
   * Пости одного автора (відкритий профіль).
   * Фільтрація по authorId = profileUserId — на бекенді.
   * GET /users/:authorId/posts
   * Не плутати з list() (глобальна стрічка).
   */
  async listByAuthor(authorId) {
    if (!authorId) return [];
    const { data } = await api.get(
      `/users/${encodeURIComponent(authorId)}/posts`
    );
    return extractPostsList(data);
  },

  async create({
    fullText,
    imageUrl,
    location,
    originalPostId,
    visibility = "PUBLIC",
  }) {
    const payload = {
      fullText: fullText?.trim() || "",
      imageUrl: imageUrl || undefined,
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
