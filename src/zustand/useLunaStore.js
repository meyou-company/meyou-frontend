import { create } from "zustand";
import { lunaApi } from "../services/lunaApi";
import {
  applyLunaSession,
  broadcastLunaSync,
  hasUnsentDraft,
  readStoredConversationId,
  writeStoredConversationId,
} from "../utils/lunaConversations";

function nonce() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isMissingConversation(error) {
  return error?.response?.data?.code === "LUNA_CONVERSATION_NOT_FOUND";
}

export const useLunaStore = create((set, get) => ({
  isOpen: false,
  appearance: null,
  demo: false,
  messages: [],
  conversations: [],
  conversationId: null,
  supportsConversations: false,
  loading: false,
  sending: false,
  mutating: false,
  error: null,
  lastNonce: null,
  lastText: null,
  lastImage: null,
  greetingPlayed: false,
  sheet: null,
  confirm: null,
  searchQuery: "",
  searchResults: [],
  searching: false,
  highlightMessageId: null,
  draftText: "",
  draftHasPhoto: false,
  draftEpoch: 0,

  setDraft(text, hasPhoto) {
    set({ draftText: String(text ?? ""), draftHasPhoto: Boolean(hasPhoto) });
  },
  setSheet(sheet) {
    set({
      sheet,
      searchQuery: "",
      searchResults: [],
      highlightMessageId: null,
    });
    if (sheet === "history" || sheet === "search") {
      void get().load(get().conversationId);
    }
  },
  askConfirm(confirm) {
    set({ confirm });
  },
  cancelConfirm() {
    set({ confirm: null });
  },
  requestNewChat() {
    const { supportsConversations, draftText, draftHasPhoto } = get();
    if (!supportsConversations) return;
    if (hasUnsentDraft(draftText, draftHasPhoto)) {
      set({ confirm: { kind: "newChat" }, sheet: null });
      return;
    }
    void get().createConversation();
  },
  requestClear() {
    if (!get().conversationId) return;
    set({ confirm: { kind: "clear" }, sheet: null });
  },
  requestDelete(conversationId) {
    const id = conversationId || get().conversationId;
    if (!id) return;
    set({ confirm: { kind: "delete", conversationId: id } });
  },

  open() {
    set({ isOpen: true, error: null });
    void get().load();
  },
  close() {
    set({ isOpen: false, sheet: null, confirm: null, searchQuery: "", searchResults: [] });
  },
  async load(conversationId) {
    if (get().sending) return;
    set({ loading: true, error: null });
    const requested =
      conversationId || get().conversationId || readStoredConversationId();
    try {
      let session;
      try {
        session = await lunaApi.getSession(requested || undefined);
      } catch (error) {
        if (requested && isMissingConversation(error)) {
          writeStoredConversationId(null);
          session = await lunaApi.getSession();
        } else {
          throw error;
        }
      }
      if (get().sending) {
        set({ loading: false });
        return;
      }
      set({
        ...applyLunaSession(session),
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error });
    }
  },
  async chooseAppearance(appearance) {
    set({ loading: true, error: null });
    try {
      const session = await lunaApi.setAppearance(
        appearance,
        get().conversationId || undefined,
      );
      const messages = session.messages ?? [];
      set({
        ...applyLunaSession(session),
        loading: false,
        greetingPlayed: messages.length === 0 ? false : get().greetingPlayed,
      });
    } catch (error) {
      set({ loading: false, error });
      throw error;
    }
  },
  async createConversation() {
    if (!get().supportsConversations || get().mutating || get().sending) return;
    set({ mutating: true, error: null, confirm: null, sheet: null });
    try {
      const session = await lunaApi.createConversation();
      set({
        ...applyLunaSession(session),
        mutating: false,
        greetingPlayed: false,
        draftEpoch: get().draftEpoch + 1,
      });
      broadcastLunaSync({ type: "list" });
    } catch (error) {
      set({ mutating: false, error });
    }
  },
  async openConversation(id) {
    if (!id || get().sending) return;
    const same = id === get().conversationId;
    set({
      sheet: null,
      confirm: null,
      ...(same ? {} : { draftEpoch: get().draftEpoch + 1 }),
    });
    await get().load(id);
  },
  async clearConversation() {
    const id = get().conversationId;
    if (!id || get().mutating) return;
    set({ mutating: true, error: null, confirm: null });
    try {
      const session = await lunaApi.clearConversation(id);
      set({
        ...applyLunaSession(session),
        mutating: false,
        greetingPlayed: false,
        draftEpoch: get().draftEpoch + 1,
      });
      broadcastLunaSync({ type: "conversation", conversationId: id });
    } catch (error) {
      set({ mutating: false, error });
    }
  },
  async deleteConversation(id) {
    const target = id || get().conversationId;
    if (!target || get().mutating) return;
    set({ mutating: true, error: null, confirm: null, sheet: null });
    try {
      const session = await lunaApi.deleteConversation(target);
      set({
        ...applyLunaSession(session),
        mutating: false,
        greetingPlayed: session.messages?.length ? get().greetingPlayed : false,
        draftEpoch: get().draftEpoch + 1,
      });
      if (!session.conversation) writeStoredConversationId(null);
      broadcastLunaSync({ type: "deleted", conversationId: target });
    } catch (error) {
      set({ mutating: false, error });
    }
  },
  async search(q) {
    const id = get().conversationId;
    if (!id) return;
    const query = String(q ?? "").trim();
    set({ searchQuery: q, searching: true, error: null });
    if (!query) {
      set({ searchResults: [], searching: false });
      return;
    }
    try {
      const result = await lunaApi.searchConversation(id, query);
      set({ searchResults: result.messages ?? [], searching: false });
    } catch (error) {
      set({ searching: false, error });
    }
  },
  jumpToMessage(id) {
    set({ highlightMessageId: id, sheet: null });
  },
  async send(text, imageFile) {
    const trimmed = String(text ?? "").trim();
    if ((!trimmed && !imageFile) || get().sending) return;
    const clientNonce = nonce();
    const conversationId = get().conversationId;
    const optimistic = {
      id: `tmp-${clientNonce}`,
      role: "user",
      text: trimmed,
      stickerId: null,
      appearance: get().appearance,
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : null,
      inputKind: imageFile ? "IMAGE" : "TEXT",
      createdAt: new Date().toISOString(),
      pending: true,
    };
    set({
      sending: true,
      error: null,
      lastNonce: clientNonce,
      lastText: trimmed,
      lastImage: imageFile || null,
      messages: [...get().messages, optimistic],
    });
    try {
      const result = await lunaApi.sendMessage({
        text: trimmed,
        clientNonce,
        imageFile,
        conversationId: conversationId || undefined,
      });
      set((state) => {
        const withoutTemp = state.messages.filter((m) => m.id !== optimistic.id);
        const next = [...withoutTemp];
        if (result.userMessage) next.push(result.userMessage);
        if (result.assistantMessage) next.push(result.assistantMessage);
        return {
          sending: false,
          demo: Boolean(result.demo),
          conversationId: result.conversationId || state.conversationId,
          messages: next,
        };
      });
      if (result.conversationId) writeStoredConversationId(result.conversationId);
      broadcastLunaSync({
        type: "conversation",
        conversationId: result.conversationId || conversationId,
      });
    } catch (error) {
      set((state) => ({
        sending: false,
        error,
        messages: state.messages.map((m) =>
          m.id === optimistic.id ? { ...m, pending: false, failed: true } : m,
        ),
      }));
    }
  },
  async retry() {
    const { lastText, lastNonce, lastImage, messages, conversationId } = get();
    if ((!lastText && !lastImage) || !lastNonce) return;
    set({
      sending: true,
      error: null,
      messages: messages.map((m) =>
        m.failed ? { ...m, failed: false, pending: true } : m,
      ),
    });
    try {
      const result = await lunaApi.sendMessage({
        text: lastText,
        clientNonce: lastNonce,
        imageFile: lastImage || undefined,
        conversationId: conversationId || undefined,
      });
      set((state) => {
        const cleaned = state.messages.filter((m) => !m.failed && !m.pending);
        const next = [...cleaned];
        if (result.userMessage && !next.some((m) => m.id === result.userMessage.id)) {
          next.push(result.userMessage);
        }
        if (
          result.assistantMessage &&
          !next.some((m) => m.id === result.assistantMessage.id)
        ) {
          next.push(result.assistantMessage);
        }
        return {
          sending: false,
          demo: Boolean(result.demo),
          conversationId: result.conversationId || state.conversationId,
          messages: next,
        };
      });
      broadcastLunaSync({
        type: "conversation",
        conversationId: result.conversationId || conversationId,
      });
    } catch (error) {
      set((state) => ({
        sending: false,
        error,
        messages: state.messages.map((m) =>
          m.pending ? { ...m, pending: false, failed: true } : m,
        ),
      }));
    }
  },
  markGreetingPlayed() {
    set({ greetingPlayed: true });
  },
}));
