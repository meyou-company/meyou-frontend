import { api, setAccessToken } from "./api";

export const authApi = {
  // ===== AUTH =====
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
    // refresh працює через cookie + JwtRefreshGuard
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

  // ===== USER =====
  async me() {
    const { data } = await api.get("/users/me");
    return data;
  },

  // ===== EMAIL VERIFICATION (❗ НЕ ЧІПАЄМО) =====
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
