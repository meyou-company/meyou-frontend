const STORAGE_KEY = "lunmeyo_client_device_id";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ld-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser id (not proof of identity; copied if device is cloned). */
export function getClientDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

const SESSION_ID_KEY = "lunmeyo_session_id";

export function persistSessionId(sessionId) {
  if (!sessionId) return;
  try {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch {
    /* ignore */
  }
}

export function getStoredSessionId() {
  try {
    return sessionStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function clearStoredSessionId() {
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
  } catch {
    /* ignore */
  }
}