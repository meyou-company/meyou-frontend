import { api } from "./api";

/**
 * API підписок — як надав бекенд:
 *   POST   /subscriptions/:userId
 *   DELETE /subscriptions/:userId
 *   GET    /subscriptions/following
 *   GET    /subscriptions/followers
 */
export const subscriptionsApi = {
  /** Підписатися на користувача — POST /subscriptions/:userId */
  subscribe(userId) {
    return api.post(`/subscriptions/${userId}`);
  },

  /** Відписатися — DELETE /subscriptions/:userId */
  unsubscribe(userId) {
    return api.delete(`/subscriptions/${userId}`);
  },

  /**
   * Список підписок (following).
   * @param {{ take?: number, cursor?: string }} params — take (limit), cursor (nextCursor з попередньої відповіді)
   * @returns {{ data: { items: Array, hasMore?: boolean, nextCursor?: string } }}
   */
  getFollowing(params = {}) {
    return api.get("/subscriptions/following", { params });
  },

  /**
   * Список підписників (followers).
   * @param {{ take?: number, cursor?: string }} params
   * @returns {{ data: { items: Array, hasMore?: boolean, nextCursor?: string } }}
   */
  getFollowers(params = {}) {
    return api.get("/subscriptions/followers", { params });
  },
};
