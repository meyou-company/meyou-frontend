import { api } from "./api";

export const subscriptionsApi = {
  /** Підписатися на користувача */
  subscribe(userId) {
    return api.post(`/subscriptions/${userId}`);
  },

  /** Відписатися */
  unsubscribe(userId) {
    return api.delete(`/subscriptions/${userId}`);
  },

  /** Список підписок (following) */
  getFollowing(params = {}) {
    return api.get("/subscriptions/following", { params });
  },

  /** Список підписників (followers) */
  getFollowers(params = {}) {
    return api.get("/subscriptions/followers", { params });
  },
};
