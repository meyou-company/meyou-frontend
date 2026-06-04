import { useEffect } from 'react';
import { toast } from 'sonner';

import { connectSocket } from '../services/socket';
import { useAuthStore } from '../zustand/useAuthStore';
import { useNotificationsStore } from '../zustand/useNotificationsStore';

export function NotificationsSocketProvider() {
  const token = useAuthStore((s) => s.token);

  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const updateNotification = useNotificationsStore((s) => s.updateNotification);
  const markNotificationReadLocal = useNotificationsStore((s) => s.markNotificationReadLocal);
  const markAllReadLocal = useNotificationsStore((s) => s.markAllReadLocal);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    fetchUnreadCount();

    socket.on('connect', () => {
      console.log('connected:', socket.id);
      console.log('socket token:', token);
      fetchUnreadCount();
    });

    socket.onAny((event, data) => {
      console.log('🔥 EVENT:', event, data);
    });

    socket.on('notification.created', (notification) => {
      console.log('SOCKET EVENT:', notification);
      addNotification(notification);
      console.log('STORE AFTER:', useNotificationsStore.getState().unreadCount);
      toast(notification.title ?? 'Нова нотифікація');
    });

    socket.on('notification.updated', (notification) => {
      updateNotification(notification);
    });

    socket.on('notification.read', (notification) => {
      markNotificationReadLocal(notification.id);
    });

    socket.on('notification.read_all', () => {
      markAllReadLocal();
    });

    return () => {
      socket.offAny();
      socket.off('notification.created');
      socket.off('notification.updated');
      socket.off('notification.read');
      socket.off('notification.read_all');
    };
  }, [token]);

  return null;
}
