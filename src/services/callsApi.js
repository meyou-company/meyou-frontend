import { api, apiPath } from './api';

export const callsApi = {
  async start(conversationId, { mediaType }) {
    const { data } = await api.post(
      apiPath(`/conversations/${encodeURIComponent(conversationId)}/calls`),
      { mediaType },
    );
    return data;
  },

  async getActive() {
    const { data } = await api.get(apiPath('/calls/active'));
    return data;
  },

  async accept(callId) {
    const { data } = await api.post(
      apiPath(`/calls/${encodeURIComponent(callId)}/accept`),
    );
    return data;
  },

  async reject(callId) {
    const { data } = await api.post(
      apiPath(`/calls/${encodeURIComponent(callId)}/reject`),
    );
    return data;
  },

  async cancel(callId) {
    const { data } = await api.post(
      apiPath(`/calls/${encodeURIComponent(callId)}/cancel`),
    );
    return data;
  },

  async end(callId) {
    const { data } = await api.post(
      apiPath(`/calls/${encodeURIComponent(callId)}/end`),
    );
    return data;
  },
};
