import { io } from "socket.io-client";
import {
  AUTH_ACCESS_TOKEN_UPDATED_EVENT,
  getSessionAccessToken,
  resolvedApiBaseUrl,
} from "./api";

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
  const currentToken = getSessionAccessToken() || token;
  if (!currentToken) return null;

  if (socket && socketToken !== currentToken) {
    socketToken = currentToken;
    socket.auth = { token: currentToken };
    socket.disconnect();
    socket.connect();
    return socket;
  }

  socketToken = currentToken;
  if (socket) {
    socket.auth = { token: currentToken };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(resolveLiveSocketUrl(), {
    auth: { token: currentToken },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function getLiveSocket() {
  return socket;
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_ACCESS_TOKEN_UPDATED_EVENT, (event) => {
    const accessToken = event?.detail?.accessToken;
    if (!accessToken || !socket || socketToken === accessToken) return;
    connectLiveSocket(accessToken);
  });
}
