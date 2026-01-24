import { api } from "./api";

export const profileApi = {
  async getProfileStatus() {
    const { data } = await api.get("/users/profile/status");
    return data;
  },

  async completeProfile(payload) {
    const { data } = await api.post("/users/profile/complete", payload);
    return data;
  },

  async updateProfile(payload) {
    const { data } = await api.put("/users/profile", payload);
    return data;
  },
};
