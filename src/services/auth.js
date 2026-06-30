import { api } from "./api";
import { dedupeAsync } from "../utils/dedupeAsync";

const ME_DEDUPE_KEY = "auth:me";

export const authApi = {
  // ===== AUTH =====
  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },

  async login(payload) {
    const { data } = await api.post("/auth/login", payload, { skipAuth: true });
    return data;
  },

  async refresh() {
    const { data } = await api.post("/auth/refresh");
    return data;
  },

  async logout() {
    await api.post("/auth/logout");
  },

  async logoutAll() {
    await api.post("/auth/logout-all");
  },

  // ===== USER =====
  /** GET /users/me — deduped by default; pass { force: true } after profile edits. */
  async me(options = {}) {
    const force = options?.force === true;
    if (force) {
      const { data } = await api.get("/users/me");
      return data;
    }
    return dedupeAsync(ME_DEDUPE_KEY, async () => {
      const { data } = await api.get("/users/me");
      return data;
    });
  },

  // ===== EMAIL VERIFICATION =====
  async verifyEmail(code) {
    const { data } = await api.post("/verification/confirm", { code });
    return data;
  },

  async resendEmailCode() {
    const { data } = await api.post("/verification/resend");
    return data;
  },

  async verificationStatus() {
    const { data } = await api.get("/verification/status");
    return data;
  },

  // ===== PASSWORD RESET =====
  async verifyResetCode({ email, code }) {
    const { data } = await api.post("/auth/verify-reset-code", { email, code });
    return data;
  },

  async resetPassword({ email, code, newPassword }) {
    const { data } = await api.post("/auth/reset-password", { email, code, newPassword });
    return data;
  },

  async uploadAvatar(file) {
    const fd = new FormData();
    fd.append("avatar", file);
    const { data } = await api.post("/users/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async deleteAvatar() {
    const { data } = await api.delete("/users/avatar");
    return data;
  },
};
