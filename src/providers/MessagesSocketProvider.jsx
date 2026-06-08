import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { isPublicPath } from '../constants/publicRoutes';
import {
  dispatchMessageCreated,
  dispatchMessageRead,
} from '../constants/messageEvents';
import { getSessionAccessToken } from '../services/api';
import { connectSocket } from '../services/socket';
import {
  ensureMessageNotificationPermission,
  showMessageBrowserNotification,
} from '../utils/messageBrowserNotification';
import { playMessageSound } from '../utils/messageSound';
import { useAuthStore } from '../zustand/useAuthStore';
import { useMessagesStore } from '../zustand/useMessagesStore';

function unwrapMessageEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return envelope;
  }
  if (envelope.message && typeof envelope.message === 'object') {
    return envelope;
  }
  return envelope;
}

function getSenderLabel(message) {
  const actor = message?.sender || message?.actor;
  if (!actor) return 'Пользователь';
  const full = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return full || actor.username || actor.name || 'Пользователь';
}

export function MessagesSocketProvider() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);
  const token = storeToken ?? getSessionAccessToken();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const currentUserId = user?.id;

  const fetchTotalUnreadCount = useMessagesStore((s) => s.fetchTotalUnreadCount);
  const setTotalUnreadCount = useMessagesStore((s) => s.setTotalUnreadCount);
  const applyMessageCreated = useMessagesStore((s) => s.applyMessageCreated);
  const applyConversationRead = useMessagesStore((s) => s.applyConversationRead);
  const activeConversationId = useMessagesStore((s) => s.activeConversationId);
  const soundEnabled = useMessagesStore((s) => s.soundEnabled);

  const canConnectSocket =
    !isAuthLoading &&
    isAuthed &&
    Boolean(user) &&
    Boolean(token) &&
    !isPublicPath(location.pathname);

  useEffect(() => {
    if (!canConnectSocket) return;
    void ensureMessageNotificationPermission();
  }, [canConnectSocket]);

  useEffect(() => {
    if (!canConnectSocket) {
      return;
    }

    const socket = connectSocket(token);
    if (!socket) return;

    fetchTotalUnreadCount();

    const onCreated = (rawEnvelope) => {
      const envelope = unwrapMessageEnvelope(rawEnvelope);
      const message = envelope?.message;
      const conversationId = envelope?.conversationId;
      const senderId = message?.senderId;

      console.log('NEW MESSAGE REALTIME:', envelope);

      if (senderId && currentUserId && String(senderId) === String(currentUserId)) {
        return;
      }

      applyMessageCreated({
        conversationId,
        unreadCount: envelope?.unreadCount,
        totalUnreadCount: envelope?.totalUnreadCount,
      });

      dispatchMessageCreated(envelope);

      const isActiveChat =
        activeConversationId &&
        conversationId &&
        String(activeConversationId) === String(conversationId) &&
        document.visibilityState === 'visible' &&
        location.pathname.startsWith('/messages');

      if (!isActiveChat) {
        if (soundEnabled) {
          playMessageSound();
        }

        const onMessagesRoute = location.pathname.startsWith('/messages');
        const tabHidden = document.visibilityState !== 'visible';

        if (tabHidden || !onMessagesRoute) {
          showMessageBrowserNotification({
            title: `Новое сообщение от ${getSenderLabel(message)}`,
            body: message?.text || '',
            conversationId,
          });
        }
      }
    };

    const onRead = (envelope) => {
      if (typeof envelope?.totalUnreadCount === 'number') {
        setTotalUnreadCount(envelope.totalUnreadCount);
      }
      applyConversationRead(envelope);
      dispatchMessageRead(envelope);
    };

    socket.on('connect', () => fetchTotalUnreadCount());
    socket.on('message.created', onCreated);
    socket.on('message.read', onRead);

    return () => {
      socket.off('connect');
      socket.off('message.created', onCreated);
      socket.off('message.read', onRead);
    };
  }, [
    canConnectSocket,
    token,
    currentUserId,
    activeConversationId,
    soundEnabled,
    location.pathname,
    fetchTotalUnreadCount,
    setTotalUnreadCount,
    applyMessageCreated,
    applyConversationRead,
  ]);

  return null;
}
