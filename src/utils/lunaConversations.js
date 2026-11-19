import { normalizeLunaAppearance } from "./lunaAssets.js";

export const LUNA_CONVERSATION_STORAGE_KEY = "lunmeyo.luna.activeConversation";
export const LUNA_SYNC_CHANNEL = "lunmeyo.luna.sync";
export const LUNA_SYNC_STORAGE_KEY = "lunmeyo.luna.syncEvent";

export function supportsLunaConversations(session) {
  return Array.isArray(session?.conversations);
}

export function readStoredConversationId() {
  try {
    return sessionStorage.getItem(LUNA_CONVERSATION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function writeStoredConversationId(id) {
  try {
    if (id) sessionStorage.setItem(LUNA_CONVERSATION_STORAGE_KEY, id);
    else sessionStorage.removeItem(LUNA_CONVERSATION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function conversationDisplayTitle(conversation, untitled = "New chat") {
  const title = String(conversation?.title ?? "").trim();
  if (title) return title;
  const preview = String(conversation?.preview ?? "").trim();
  if (preview) return preview;
  return untitled;
}

export function hasUnsentDraft(text, hasPhoto) {
  return Boolean(String(text ?? "").trim() || hasPhoto);
}

export function applyLunaSession(session, extra = {}) {
  const supports = supportsLunaConversations(session);
  const conversation = session?.conversation ?? null;
  if (conversation?.id) writeStoredConversationId(conversation.id);
  else if (supports && !conversation) writeStoredConversationId(null);
  return {
    appearance: normalizeLunaAppearance(session?.appearance),
    demo: Boolean(session?.demo),
    messages: session?.messages ?? [],
    conversations: supports ? session.conversations : [],
    conversationId: conversation?.id ?? null,
    supportsConversations: supports,
    ...extra,
  };
}

export function broadcastLunaSync(payload) {
  try {
    const channel = new BroadcastChannel(LUNA_SYNC_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(
      LUNA_SYNC_STORAGE_KEY,
      JSON.stringify({ ...payload, t: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function bindLunaTabSync(getState) {
  if (typeof window === "undefined") return () => {};

  const onEvent = (payload) => {
    if (!payload?.type) return;
    const state = getState();
    if (!state?.isOpen || state.sending || typeof state.load !== "function") return;
    if (payload.type === "deleted") {
      void state.load(
        payload.conversationId === state.conversationId
          ? undefined
          : state.conversationId,
      );
      return;
    }
    if (
      payload.type === "conversation" &&
      payload.conversationId &&
      payload.conversationId !== state.conversationId
    ) {
      void state.load(state.conversationId);
      return;
    }
    void state.load(state.conversationId);
  };

  let channel = null;
  try {
    channel = new BroadcastChannel(LUNA_SYNC_CHANNEL);
    channel.onmessage = (event) => onEvent(event.data);
  } catch {
    channel = null;
  }

  const onStorage = (event) => {
    if (event.key !== LUNA_SYNC_STORAGE_KEY || !event.newValue) return;
    try {
      onEvent(JSON.parse(event.newValue));
    } catch {
      /* ignore */
    }
  };
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    const state = getState();
    if (state?.isOpen && !state.sending) void state.load(state.conversationId);
  };

  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
