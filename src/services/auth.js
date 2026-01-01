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
};
