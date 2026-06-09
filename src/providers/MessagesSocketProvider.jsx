import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { isPublicPath } from '../constants/publicRoutes';
import {
  dispatchMessageCreated,
  dispatchMessageDeleted,
  dispatchMessagePinned,
  dispatchMessageReactionAdded,
  dispatchMessageReactionRemoved,
  dispatchMessageRead,
  dispatchMessageSeen,
  dispatchMessageUnpinned,
  dispatchMessageUpdated,
  dispatchUserStopTyping,
  dispatchUserTyping,
} from '../constants/messageEvents';
import { getSessionAccessToken } from '../services/api';
import { connectSocket } from '../services/socket';
import {
  ensureMessageNotificationPermission,
  showMessageBrowserNotification,
} from '../utils/messageBrowserNotification';
import { i18n } from '../i18n';
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
  if (!actor) return i18n.t('common.user');
  const full = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return full || actor.username || actor.name || i18n.t('common.user');
}

export function MessagesSocketProvider() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);
  const token = storeToken ?? getSessionAccessToken();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);

  const fetchTotalUnreadCount = useMessagesStore((s) => s.fetchTotalUnreadCount);
  const setTotalUnreadCount = useMessagesStore((s) => s.setTotalUnreadCount);
  const applyMessageCreated = useMessagesStore((s) => s.applyMessageCreated);
  const applyConversationRead = useMessagesStore((s) => s.applyConversationRead);
  const activeConversationId = useMessagesStore((s) => s.activeConversationId);
  const soundEnabled = useMessagesStore((s) => s.soundEnabled);

  const contextRef = useRef({});
  contextRef.current = {
    currentUserId: user?.id,
    activeConversationId,
    soundEnabled,
    pathname: location.pathname,
    fetchTotalUnreadCount,
    setTotalUnreadCount,
    applyMessageCreated,
    applyConversationRead,
  };

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
    if (!canConnectSocket || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const refreshUnread = (force = false) => {
      void contextRef.current.fetchTotalUnreadCount?.(force);
    };

    const onCreated = (rawEnvelope) => {
      const ctx = contextRef.current;
      const envelope = unwrapMessageEnvelope(rawEnvelope);
      const message = envelope?.message;
      const conversationId = envelope?.conversationId;
      const senderId = message?.senderId;

      if (senderId && ctx.currentUserId && String(senderId) === String(ctx.currentUserId)) {
        return;
      }

      ctx.applyMessageCreated?.({
        conversationId,
        unreadCount: envelope?.unreadCount,
        totalUnreadCount: envelope?.totalUnreadCount,
      });

      dispatchMessageCreated(envelope);

      const isActiveChat =
        ctx.activeConversationId &&
        conversationId &&
        String(ctx.activeConversationId) === String(conversationId) &&
        document.visibilityState === 'visible' &&
        ctx.pathname.startsWith('/messages');

      if (!isActiveChat) {
        if (ctx.soundEnabled) {
          playMessageSound();
        }

        const onMessagesRoute = ctx.pathname.startsWith('/messages');
        const tabHidden = document.visibilityState !== 'visible';

        if (tabHidden || !onMessagesRoute) {
          showMessageBrowserNotification({
            title: i18n.t('messenger.newMessageFrom', { name: getSenderLabel(message) }),
            body: message?.text || '',
            conversationId,
          });
        }
      }
    };

    const onRead = (envelope) => {
      const ctx = contextRef.current;
      if (typeof envelope?.totalUnreadCount === 'number') {
        ctx.setTotalUnreadCount?.(envelope.totalUnreadCount);
      }
      ctx.applyConversationRead?.(envelope);
      dispatchMessageRead(envelope);
    };

    const onUpdated = (envelope) => dispatchMessageUpdated(envelope);
    const onDeleted = (envelope) => dispatchMessageDeleted(envelope);
    const onSeen = (envelope) => dispatchMessageSeen(envelope);
    const onReactionAdded = (envelope) => dispatchMessageReactionAdded(envelope);
    const onReactionRemoved = (envelope) => dispatchMessageReactionRemoved(envelope);
    const onPinned = (envelope) => dispatchMessagePinned(envelope);
    const onUnpinned = (envelope) => dispatchMessageUnpinned(envelope);
    const onTyping = (envelope) => dispatchUserTyping(envelope);
    const onStopTyping = (envelope) => dispatchUserStopTyping(envelope);

    const onConnect = () => refreshUnread();

    socket.on('connect', onConnect);
    socket.on('message.created', onCreated);
    socket.on('message.read', onRead);
    socket.on('message.updated', onUpdated);
    socket.on('message.deleted', onDeleted);
    socket.on('message.seen', onSeen);
    socket.on('message.reactionAdded', onReactionAdded);
    socket.on('message.reactionRemoved', onReactionRemoved);
    socket.on('message.pinned', onPinned);
    socket.on('message.unpinned', onUnpinned);
    socket.on('user.typing', onTyping);
    socket.on('user.stopTyping', onStopTyping);

    if (socket.connected) {
      refreshUnread();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('message.created', onCreated);
      socket.off('message.read', onRead);
      socket.off('message.updated', onUpdated);
      socket.off('message.deleted', onDeleted);
      socket.off('message.seen', onSeen);
      socket.off('message.reactionAdded', onReactionAdded);
      socket.off('message.reactionRemoved', onReactionRemoved);
      socket.off('message.pinned', onPinned);
      socket.off('message.unpinned', onUnpinned);
      socket.off('user.typing', onTyping);
      socket.off('user.stopTyping', onStopTyping);
    };
  }, [canConnectSocket, token]);

  return null;
}
