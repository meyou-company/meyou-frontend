import { api } from './api';
import { mapNotification } from './notificationMapper';

export const notificationsApi = {
  /**
   * Список нотифікацій (pagination)
   */
  async list({ page = 1, limit = 10 } = {}) {
    const { data } = await api.get('/notifications', {
      params: { page, limit },
    });

    return {
      data: data.data.map(mapNotification),
      meta: data.meta,
    };
  },

  /**
   * Кількість непрочитаних
   */
  async getUnreadCount() {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  /**
   * Помітити як прочитане
   */
  async markAsRead(notificationId) {
    const id = encodeURIComponent(notificationId);
    await api.patch(`/notifications/${id}/read`);
  },

  /**
   * Помітити всі як прочитані
   */
  async markAllAsRead() {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  },

  /**
   * Отримати налаштування
   */
  async getSettings() {
    const { data } = await api.get('/notifications/settings');
    return data;
  },

  /**
   * Оновити налаштування
   */
  async updateSettings(payload) {
    const { data } = await api.patch('/notifications/settings', payload);
    return data;
  },

  /**
   * Реєстрація device token (push)
   */
  async registerDeviceToken(token, platform = 'web') {
    if (!token) {
      throw new Error('device token is required');
    }

    const { data } = await api.post('/notifications/device-token', {
      token,
      platform,
    });

    return data;
  },

  /**
   * Видалення device token
   */
  async deleteDeviceToken(token) {
    if (!token) {
      throw new Error('device token is required');
    }

    const { data } = await api.post('/notifications/device-token/remove', { token });

    return data;
  },
};
