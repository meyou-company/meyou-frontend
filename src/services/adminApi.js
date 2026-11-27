import { api, apiPath } from './api';

export const adminApi = {
  async getReportsOverview() {
    const { data } = await api.get(apiPath('/admin/reports'));
    return data;
  },

  async listUserReports({ status, username, userId, page = 1, limit = 20 } = {}) {
    const { data } = await api.get(apiPath('/admin/reports/users'), {
      params: {
        ...(status ? { status } : {}),
        ...(username?.trim() ? { username: username.trim() } : {}),
        ...(userId ? { userId } : {}),
        page,
        limit,
      },
    });
    return data;
  },

  async getUserReport(reportId) {
    const { data } = await api.get(
      apiPath(`/admin/reports/users/${encodeURIComponent(reportId)}`),
    );
    return data;
  },

  async updateUserReportStatus(reportId, status) {
    const { data } = await api.patch(
      apiPath(`/admin/reports/users/${encodeURIComponent(reportId)}/status`),
      { status },
    );
    return data;
  },

  async getFeedbackOverview() {
    const { data } = await api.get(apiPath('/admin/feedback/overview'));
    return data;
  },

  async listFeedback({ status, type, userId, page = 1, limit = 20 } = {}) {
    const { data } = await api.get(apiPath('/admin/feedback'), {
      params: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(userId ? { userId } : {}),
        page,
        limit,
      },
    });
    return data;
  },

  async getFeedbackScreenshotDelivery(feedbackId) {
    const { data } = await api.get(
      apiPath(
        `/admin/feedback/${encodeURIComponent(feedbackId)}/screenshot-delivery`,
      ),
    );
    return data;
  },

  async getFeedback(feedbackId) {
    const { data } = await api.get(
      apiPath(`/admin/feedback/${encodeURIComponent(feedbackId)}`),
    );
    return data;
  },

  async updateFeedbackStatus(feedbackId, status) {
    const { data } = await api.patch(
      apiPath(`/admin/feedback/${encodeURIComponent(feedbackId)}/status`),
      { status },
    );
    return data;
  },

  async replyToFeedback(feedbackId, message) {
    const { data } = await api.post(
      apiPath(`/admin/feedback/${encodeURIComponent(feedbackId)}/replies`),
      { message },
    );
    return data;
  },

  async getUsersStats() {
    const { data } = await api.get(apiPath('/admin/users/stats'));
    return data;
  },

  async listUsers({ q, status, role, vip, page = 1, limit = 25, sort } = {}) {
    const { data } = await api.get(apiPath('/admin/users'), {
      params: {
        ...(q?.trim() ? { q: q.trim() } : {}),
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
        ...(vip != null && vip !== '' ? { vip: String(vip) } : {}),
        ...(sort ? { sort } : {}),
        page,
        limit,
      },
    });
    return data;
  },

  async getUser(userId) {
    const { data } = await api.get(
      apiPath(`/admin/users/${encodeURIComponent(userId)}`),
    );
    return data;
  },

  async listUserModerationActions(userId, { page = 1, limit = 20 } = {}) {
    const { data } = await api.get(
      apiPath(`/admin/users/${encodeURIComponent(userId)}/actions`),
      { params: { page, limit } },
    );
    return data;
  },

  async warnUser(userId, body) {
    const { data } = await api.post(
      apiPath(`/admin/users/${encodeURIComponent(userId)}/warn`),
      body,
    );
    return data;
  },

  async suspendUser(userId, body) {
    const { data } = await api.post(
      apiPath(`/admin/users/${encodeURIComponent(userId)}/suspend`),
      body,
    );
    return data;
  },

  async banUser(userId, body) {
    const { data } = await api.post(
      apiPath(`/admin/users/${encodeURIComponent(userId)}/ban`),
      body,
    );
    return data;
  },

  async unbanUser(userId, body) {
    const { data } = await api.post(
      apiPath(`/admin/users/${encodeURIComponent(userId)}/unban`),
      body,
    );
    return data;
  },
};
