import { io } from "socket.io-client";
import { resolveSocketUrl } from "./socket";

let liveSocket = null;
let liveSocketToken = null;

function getLiveNamespaceUrl() {
  const socketUrl = resolveSocketUrl().replace(/\/$/, "");
  return /\/live$/i.test(socketUrl) ? socketUrl : `${socketUrl}/live`;
}

export function connectLiveSocket(token) {
  if (!token) return null;

  if (liveSocket && liveSocketToken !== token) {
    liveSocket.disconnect();
    liveSocket.removeAllListeners();
    liveSocket = null;
  }

  liveSocketToken = token;
  if (liveSocket) {
    liveSocket.auth = { token };
    if (!liveSocket.connected) liveSocket.connect();
    return liveSocket;
  }

  liveSocket = io(getLiveNamespaceUrl(), {
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return liveSocket;
}

export function getLiveSocket() {
  return liveSocket;
}
