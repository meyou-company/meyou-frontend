import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { isPublicPath } from '../constants/publicRoutes';
import {
  mapNotification,
  unwrapRealtimeNotificationEnvelope,
} from '../services/notificationMapper';
import { connectSocket } from '../services/socket';
import { getSessionAccessToken } from '../services/api';
import { useAuthStore } from '../zustand/useAuthStore';
import { useNotificationsStore } from '../zustand/useNotificationsStore';

export function NotificationsSocketProvider() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);
  const token = storeToken ?? getSessionAccessToken();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);

  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const updateNotification = useNotificationsStore((s) => s.updateNotification);
  const markNotificationReadLocal = useNotificationsStore((s) => s.markNotificationReadLocal);
  const markAllReadLocal = useNotificationsStore((s) => s.markAllReadLocal);

  const handlersRef = useRef({});
  handlersRef.current = {
    fetchUnreadCount,
    setUnreadCount,
    addNotification,
    updateNotification,
    markNotificationReadLocal,
    markAllReadLocal,
  };

  const canConnectSocket =
    !isAuthLoading &&
    isAuthed &&
    Boolean(user) &&
    Boolean(token) &&
    !isPublicPath(location.pathname);

  useEffect(() => {
    if (!canConnectSocket || !token) return;

    const socket = connectSocket(token);
    if (!socket) {
      console.warn('[notifications-socket] connect skipped: missing access token');
      return;
    }

    const refreshUnread = (force = false) => {
      void handlersRef.current.fetchUnreadCount?.(force);
    };

    const onCreated = (envelope) => {

      const { notification, unreadCountApprox } =
        unwrapRealtimeNotificationEnvelope(envelope);
      if (!notification?.id) return;

      handlersRef.current.addNotification?.(mapNotification(notification), {
        skipUnreadBump: true,
      });

      if (typeof unreadCountApprox === 'number') {
        handlersRef.current.setUnreadCount?.(unreadCountApprox);
      } else {
        refreshUnread(false);
      }

      toast(notification.body ?? notification.title ?? 'Нова нотифікація');
    };

    const onUpdated = (envelope) => {
      console.log('ON UPDATED FIRED');

      const { notification, unreadCountApprox } = unwrapRealtimeNotificationEnvelope(envelope);

      console.log('UPDATED NOTIFICATION', notification);

      if (notification?.id) {
        handlersRef.current.updateNotification?.(mapNotification(notification));
      }

      if (!notification?.readAt) {
        console.log('SHOW TOAST');
        toast(notification?.body ?? 'Нова нотифікація');
      }

      if (typeof unreadCountApprox === 'number') {
        handlersRef.current.setUnreadCount?.(unreadCountApprox);
      }
    };

    const onRead = (envelope) => {
      const { notification, unreadCountApprox } = unwrapRealtimeNotificationEnvelope(envelope);
      const id = notification?.id ?? envelope?.notificationId;
      if (id) handlersRef.current.markNotificationReadLocal?.(id);
      if (typeof unreadCountApprox === 'number') {
        handlersRef.current.setUnreadCount?.(unreadCountApprox);
      }
    };

    const onReadAll = (envelope) => {
      handlersRef.current.markAllReadLocal?.();
      if (typeof envelope?.unreadCountApprox === 'number') {
        handlersRef.current.setUnreadCount?.(envelope.unreadCountApprox);
      }
    };

    const onConnect = () => refreshUnread();

    socket.on('connect', onConnect);
    socket.on('notification.created', onCreated);
    socket.on('notification.updated', onUpdated);
    socket.on('notification.read', onRead);
    socket.on('notification.read_all', onReadAll);

    if (socket.connected) {
      refreshUnread();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('notification.created', onCreated);
      socket.off('notification.updated', onUpdated);
      socket.off('notification.read', onRead);
      socket.off('notification.read_all', onReadAll);
    };
  }, [canConnectSocket, token]);

  return null;
}
