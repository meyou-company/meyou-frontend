import { api, postSessionRefresh } from "./api";
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

  async verifyMfa({ challengeToken, code, method }) {
    const { data } = await api.post(
      "/auth/mfa/verify",
      { challengeToken, code, method },
      { skipAuth: true },
    );
    return data;
  },

  async getTotpStatus() {
    const { data } = await api.get("/auth/totp/status");
    return data;
  },

  async startTotpSetup() {
    const { data } = await api.post("/auth/totp/setup");
    return data;
  },

  async confirmTotpSetup(code) {
    const { data } = await api.post("/auth/totp/confirm", { code });
    return data;
  },

  async disableTotp(payload) {
    const { data } = await api.post("/auth/totp/disable", payload);
    return data;
  },

  async regenerateTotpBackup(payload) {
    const { data } = await api.post("/auth/totp/backup/regenerate", payload);
    return data;
  },

  async refresh() {
    const { data } = await postSessionRefresh();
    return data;
  },

  /** One-time Google OAuth code → access token (+ refresh in httpOnly cookie). */
  async exchangeOAuthCode(code) {
    const { data } = await api.post(
      "/auth/oauth/exchange",
      { code },
      { skipAuth: true },
    );
    return data;
  },

  async logout() {
    await api.post("/auth/logout");
  },

  async logoutAll() {
    await api.post("/auth/logout-all");
  },

  async listSessions() {
    const { data } = await api.get("/auth/sessions");
    return data;
  },

  async revokeSession(sessionId) {
    await api.delete(`/auth/sessions/${sessionId}`);
  },

  async updateLoginAlerts(enabled) {
    const { data } = await api.patch("/auth/login-alerts", { enabled });
    return data;
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
