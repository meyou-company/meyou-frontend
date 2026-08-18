import { io } from "socket.io-client";
import { resolvedApiBaseUrl } from "./api";

let socket = null;
let socketToken = null;

function resolveLiveSocketUrl() {
  const explicit = String(import.meta.env.VITE_SOCKET_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const base = explicit || String(resolvedApiBaseUrl)
    .replace(/\/$/, "")
    .replace(/\/api$/i, "");
  return /\/live$/i.test(base) ? base : `${base}/live`;
}

export function connectLiveSocket(token) {
  if (!token) return null;

  if (socket && socketToken !== token) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  socketToken = token;
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(resolveLiveSocketUrl(), {
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function getLiveSocket() {
  return socket;
}
