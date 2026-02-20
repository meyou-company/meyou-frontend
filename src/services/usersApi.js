import { api } from "./api";

export const usersApi = {
  search(params) {
    return api.get("/users/search", { params });
  },

  /** Публічний профіль по username (опційно з токеном → OWNER / VISITOR) */
  getByUsername(username) {
    return api.get(`/users/${encodeURIComponent(username)}`);
  },
};
