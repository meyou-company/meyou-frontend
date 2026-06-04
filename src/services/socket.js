import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (!token) return null;

  if (socket?.connected) return socket;
  console.log('TOKEN FOR SOCKET:', token);
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: {
      token,
    },
    withCredentials: true,
    transports: ['websocket'],
  });

  socket.onAny((event, ...args) => {
    console.log('🔥 GLOBAL EVENT:', event, args);
  });

  socket.on('connect', () => {
    console.log('🟢 SOCKET CONNECTED', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('🔴 SOCKET ERROR', err);
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
  socket = null;
}
