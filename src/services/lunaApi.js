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

  async sendMessage({ text, clientNonce, imageFile }) {
    if (imageFile) {
      const body = new FormData();
      if (text) body.append("text", text);
      if (clientNonce) body.append("clientNonce", clientNonce);
      body.append("image", imageFile);
      const { data } = await api.post(apiPath("/luna/messages"), body, {
        timeout: 60000,
      });
      return data;
    }
    const { data } = await api.post(apiPath("/luna/messages"), {
      text,
      clientNonce,
    });
    return data;
  },

  async transcribe({ audioFile, durationSeconds }) {
    const body = new FormData();
    body.append("audio", audioFile);
    if (durationSeconds) body.append("durationSeconds", String(durationSeconds));
    const { data } = await api.post(apiPath("/luna/transcribe"), body, {
      timeout: 60000,
    });
    return data;
  },
};
