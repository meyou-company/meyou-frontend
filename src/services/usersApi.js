import { api } from "./api";

/**
 * GET /users/:username — публічний профіль (відповідає бекенду).
 * Без авторизаційної cookie → публічні поля. З cookie-сесією →
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

  /**
   * Список підписок/друзів іншого користувача (GET /users/:username/following або /users/:username/friends).
   * Якщо бекенд не має такого ендпоінту — запит поверне 404, тоді список залишиться порожнім.
   */
  getUserFollowing(username) {
    const raw = String(username ?? "").trim();
    const value = raw.startsWith("@") ? raw.slice(1) : raw;
    if (!value) return Promise.reject(new Error("username required"));
    return api.get(`/users/${encodeURIComponent(value)}/following`);
  },

  /** Альтернатива: GET /users/:username/friends (якщо бекенд віддає список саме так) */
  getUserFriends(username) {
    const raw = String(username ?? "").trim();
    const value = raw.startsWith("@") ? raw.slice(1) : raw;
    if (!value) return Promise.reject(new Error("username required"));
    return api.get(`/users/${encodeURIComponent(value)}/friends`);
  },

  /**
   * Список підписників (followers) з полями isFollowingMe, amIFollowing, isFriend, isVip.
   * Відповідь: { followers: [{ _id, firstName, lastName, avatar, isFollowingMe, amIFollowing, isFriend, isVip }, ...] }.
   */
  getUserFollowers(username) {
    const raw = String(username ?? "").trim();
    const value = raw.startsWith("@") ? raw.slice(1) : raw;
    if (!value) return Promise.reject(new Error("username required"));
    return api.get(`/users/${encodeURIComponent(value)}/followers`);
  },
};
