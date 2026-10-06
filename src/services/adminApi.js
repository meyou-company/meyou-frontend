import { api } from './api';

export const adminApi = {
  async getReportsOverview() {
    const { data } = await api.get('/admin/reports');
    return data;
  },

  async listUserReports({ status, username, page = 1, limit = 20 } = {}) {
    const { data } = await api.get('/admin/reports/users', {
      params: {
        ...(status ? { status } : {}),
        ...(username?.trim() ? { username: username.trim() } : {}),
        page,
        limit,
      },
    });
    return data;
  },

  async getUserReport(reportId) {
    const { data } = await api.get(`/admin/reports/users/${encodeURIComponent(reportId)}`);
    return data;
  },

  async updateUserReportStatus(reportId, status) {
    const { data } = await api.patch(
      `/admin/reports/users/${encodeURIComponent(reportId)}/status`,
      { status },
    );
    return data;
  },

  async getFeedbackOverview() {
    const { data } = await api.get('/admin/feedback/overview');
    return data;
  },

  async listFeedback({ status, type, page = 1, limit = 20 } = {}) {
    const { data } = await api.get('/admin/feedback', {
      params: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        page,
        limit,
      },
    });
    return data;
  },

  async getFeedback(feedbackId) {
    const { data } = await api.get(
      `/admin/feedback/${encodeURIComponent(feedbackId)}`,
    );
    return data;
  },

  async updateFeedbackStatus(feedbackId, status) {
    const { data } = await api.patch(
      `/admin/feedback/${encodeURIComponent(feedbackId)}/status`,
      { status },
    );
    return data;
  },

  async replyToFeedback(feedbackId, message) {
    const { data } = await api.post(
      `/admin/feedback/${encodeURIComponent(feedbackId)}/replies`,
      { message },
    );
    return data;
  },
};
