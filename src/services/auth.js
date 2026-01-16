import { api, setAccessToken } from "./api";

export const authApi = {
  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    if (data?.accessToken) setAccessToken(data.accessToken);
    return data;
  },

  async login(payload) {
    const { data } = await api.post("/auth/login", payload);
    if (data?.accessToken) setAccessToken(data.accessToken);
    return data;
  },

  async refresh() {
    const { data } = await api.post("/auth/refresh");
    if (data?.accessToken) setAccessToken(data.accessToken);
    return data;
  },

  async logout() {
    await api.post("/auth/logout");
    setAccessToken(null);
  },

  async logoutAll() {
    await api.post("/auth/logout-all");
    setAccessToken(null);
  },

  async me() {
    const { data } = await api.get("/users/me");
    return data;
  },

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


  async verifyResetCode({ email, code }) {
    const { data } = await api.post("/auth/verify-reset-code", {
      email,
      code,
    });
    return data;
  },

  async resetPassword({ email, code, newPassword }) {
    const { data } = await api.post("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return data;
  },
};
