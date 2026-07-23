import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { isPublicPath } from '../constants/publicRoutes';
import { getSessionAccessToken } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { useAuthStore } from '../zustand/useAuthStore';
import { usePresenceStore } from '../zustand/usePresenceStore';

/** Must stay below server PRESENCE_HEARTBEAT_TTL_MS (60s). */
const HEARTBEAT_INTERVAL_MS = 25_000;
const PRESENCE_EVENT = 'user:presence-changed';
const HEARTBEAT_EVENT = 'presence.heartbeat';

/**
 * Reuses the shared Socket.IO singleton: heartbeat + presence event fan-in.
 */
export function PresenceSocketProvider() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);
  const token = storeToken ?? getSessionAccessToken();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const setPresence = usePresenceStore((s) => s.setPresence);
  const clearPresence = usePresenceStore((s) => s.clear);

  const heartbeatRef = useRef(null);

  const canConnectSocket =
    !isAuthLoading &&
    isAuthed &&
    Boolean(user) &&
    Boolean(token) &&
    !isPublicPath(location.pathname);

  useEffect(() => {
    if (!canConnectSocket || !token) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return undefined;
    }

    const socket = connectSocket(token);
    if (!socket) return undefined;

    const emitHeartbeat = () => {
      const s = getSocket();
      if (s?.connected) {
        s.emit(HEARTBEAT_EVENT);
      }
    };

    const startHeartbeat = () => {
      emitHeartbeat();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const onPresenceChanged = (payload) => {
      if (!payload?.userId) return;
      setPresence(payload.userId, {
        isOnline: Boolean(payload.isOnline),
        lastSeenAt: payload.lastSeenAt ?? null,
      });
    };

    const onConnect = () => {
      startHeartbeat();
    };

    const onDisconnect = () => {
      stopHeartbeat();
    };

    socket.on(PRESENCE_EVENT, onPresenceChanged);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      startHeartbeat();
    }

    return () => {
      stopHeartbeat();
      socket.off(PRESENCE_EVENT, onPresenceChanged);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [canConnectSocket, token, setPresence]);

  useEffect(() => {
    if (!isAuthed) {
      clearPresence();
    }
  }, [isAuthed, clearPresence]);

  return null;
}
