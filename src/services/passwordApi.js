import { api } from "./api";

export const passwordApi = {
  async forgotPassword(email) {
    return api.post(
      "/auth/forgot-password",
      { email },
      { skipAuth: true }
    );
  },

  async verifyResetCode({ email, code }) {
    const { data } = await api.post(
      "/auth/verify-reset-code",
      { email, code },
      { skipAuth: true }
    );
    return data;
  },

  async resetPassword({ email, code, newPassword }) {
    const { data } = await api.post(
      "/auth/reset-password",
      { email, code, newPassword },
      { skipAuth: true }
    );
    return data;
  },
};
