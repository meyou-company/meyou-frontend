import { api } from "./api";

export const profileApi = {
  async getProfile() {
    const { data } = await api.get("/profile");
    return data;
  },

  async completeProfile(payload) {
    const { data } = await api.post("/users/profile/complete", payload);
    return data;
  },

  async getProfileStatus() {
    const { data } = await api.get("/users/profile/status");
    return data;
  },
};
