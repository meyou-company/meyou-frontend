import { api, apiPath } from "./api";

export const lunaApi = {
  async getSession() {
    const { data } = await api.get(apiPath("/luna"));
    return data;
  },

  async setAppearance(appearance) {
    const { data } = await api.patch(apiPath("/luna/appearance"), { appearance });
    return data;
  },

  async sendMessage({ text, clientNonce }) {
    const { data } = await api.post(apiPath("/luna/messages"), {
      text,
      clientNonce,
    });
    return data;
  },
};
