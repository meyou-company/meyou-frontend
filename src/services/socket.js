import { io } from 'socket.io-client';

import { resolvedApiBaseUrl } from './api';

let socket = null;
let socketToken = null;

function resolveSocketUrl() {
  const explicit = String(import.meta.env.VITE_SOCKET_URL ?? '')
    .trim()
    .replace(/\/$/, '');
  if (explicit) return explicit;

  const api = String(resolvedApiBaseUrl).replace(/\/$/, '');
  if (/^https?:\/\//i.test(api)) {
    return api.replace(/\/api$/i, '') || api;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function connectSocket(token) {
  if (!token) return null;

  if (socket && socketToken !== token) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    socketToken = null;
  }

  if (socket?.connected && socketToken === token) {
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const socketUrl = resolveSocketUrl();
  socketToken = token;
  socket = io(socketUrl, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('🟢 SOCKET CONNECTED', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('🔴 SOCKET ERROR', err?.message ?? err);
  });

  socket.on('disconnect', (reason) => {
    console.log('⚪ SOCKET DISCONNECTED', reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
  socketToken = null;
}
