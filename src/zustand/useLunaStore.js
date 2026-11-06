import { create } from "zustand";
import { lunaApi } from "../services/lunaApi";
import { normalizeLunaAppearance } from "../utils/lunaAssets";

function nonce() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useLunaStore = create((set, get) => ({
  isOpen: false,
  appearance: null,
  demo: false,
  messages: [],
  loading: false,
  sending: false,
  error: null,
  lastNonce: null,
  lastText: null,
  greetingPlayed: false,

  open() {
    set({ isOpen: true, error: null });
    void get().load();
  },
  close() {
    set({ isOpen: false });
  },
  async load() {
    if (get().sending) return;
    set({ loading: true, error: null });
    try {
      const session = await lunaApi.getSession();
      if (get().sending) {
        set({ loading: false });
        return;
      }
      set({
        appearance: normalizeLunaAppearance(session.appearance),
        demo: Boolean(session.demo),
        messages: session.messages ?? [],
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error });
    }
  },
  async chooseAppearance(appearance) {
    set({ loading: true, error: null });
    try {
      const session = await lunaApi.setAppearance(appearance);
      const messages = session.messages ?? [];
      set({
        appearance: normalizeLunaAppearance(session.appearance),
        demo: Boolean(session.demo),
        messages,
        loading: false,
        greetingPlayed: messages.length === 0 ? false : get().greetingPlayed,
      });
    } catch (error) {
      set({ loading: false, error });
      throw error;
    }
  },
  async send(text) {
    const trimmed = String(text ?? "").trim();
    if (!trimmed || get().sending) return;
    const clientNonce = nonce();
    const optimistic = {
      id: `tmp-${clientNonce}`,
      role: "user",
      text: trimmed,
      stickerId: null,
      appearance: get().appearance,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    set({
      sending: true,
      error: null,
      lastNonce: clientNonce,
      lastText: trimmed,
      messages: [...get().messages, optimistic],
    });
    try {
      const result = await lunaApi.sendMessage({ text: trimmed, clientNonce });
      set((state) => {
        const withoutTemp = state.messages.filter((m) => m.id !== optimistic.id);
        const next = [...withoutTemp];
        if (result.userMessage) next.push(result.userMessage);
        if (result.assistantMessage) next.push(result.assistantMessage);
        return {
          sending: false,
          demo: Boolean(result.demo),
          messages: next,
        };
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
    const { lastText, lastNonce, messages } = get();
    if (!lastText || !lastNonce) return;
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
        return { sending: false, demo: Boolean(result.demo), messages: next };
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
