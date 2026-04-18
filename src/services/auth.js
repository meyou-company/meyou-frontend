import { api } from "./api";

export const authApi = {
  // ===== AUTH =====
  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },

  async login(payload) {
    const { data } = await api.post("/auth/login", payload);
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
  async me() {
    const { data } = await api.get("/users/me");
    return data;
  },

  // ===== EMAIL VERIFICATION =====
  async verifyEmail(code) {
    const { data } = await api.post("/verification/verify", { code });
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
    const { data } = await api.patch("/users/me/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async deleteAvatar() {
    const { data } = await api.delete("/users/me/avatar");
    return data;
  },
};
