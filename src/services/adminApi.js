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
};
