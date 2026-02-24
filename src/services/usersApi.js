import { api } from "./api";

/**
 * GET /users/:username — публічний профіль (відповідає бекенду).
 * Без токена → публічні поля. З токеном (Bearer або cookie) →
 * viewType: 'OWNER' | 'VISITOR', subscriptionStatus: { isSubscribed, isBlocked }.
 */
export const usersApi = {
  search(params) {
    return api.get("/users/search", { params });
  },

  /**
   * Публічний профіль по username (не uuid/id).
   * Прибирає ведучий @ (напр. @maria → maria). Регістр не змінюється.
   */
  getByUsername(username) {
    const raw = String(username ?? "").trim();
    const value = raw.startsWith("@") ? raw.slice(1) : raw;
    return api.get(`/users/${encodeURIComponent(value)}`);
  },
};
