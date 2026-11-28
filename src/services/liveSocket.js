import { io } from "socket.io-client";
import {
  AUTH_ACCESS_TOKEN_UPDATED_EVENT,
  getSessionAccessToken,
  resolvedApiBaseUrl,
} from "./api";

let socket = null;
let socketToken = null;

/** Window key so HMR re-eval does not stack duplicate auth listeners. */
const LIVE_SOCKET_AUTH_HANDLER_KEY = "__lunmeyoLiveSocketOnAccessTokenUpdated";

function resolveLiveSocketUrl() {
  const explicit = String(import.meta.env.VITE_SOCKET_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const base = explicit || String(resolvedApiBaseUrl)
    .replace(/\/$/, "")
    .replace(/\/api$/i, "");
  return /\/live$/i.test(base) ? base : `${base}/live`;
}

function onAccessTokenUpdated(event) {
  const accessToken = event?.detail?.accessToken;
  if (!accessToken || !socket || socketToken === accessToken) return;
  connectLiveSocket(accessToken);
}

export function ensureLiveSocketAuthTokenListener() {
  if (typeof window === "undefined") return;
  const prev = window[LIVE_SOCKET_AUTH_HANDLER_KEY];
  if (prev) {
    window.removeEventListener(AUTH_ACCESS_TOKEN_UPDATED_EVENT, prev);
  }
  window[LIVE_SOCKET_AUTH_HANDLER_KEY] = onAccessTokenUpdated;
  window.addEventListener(AUTH_ACCESS_TOKEN_UPDATED_EVENT, onAccessTokenUpdated);
}

export function teardownLiveSocketAuthTokenListener() {
  if (typeof window === "undefined") return;
  const prev = window[LIVE_SOCKET_AUTH_HANDLER_KEY];
  if (prev) {
    window.removeEventListener(AUTH_ACCESS_TOKEN_UPDATED_EVENT, prev);
    delete window[LIVE_SOCKET_AUTH_HANDLER_KEY];
  }
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

ensureLiveSocketAuthTokenListener();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownLiveSocketAuthTokenListener();
  });
}