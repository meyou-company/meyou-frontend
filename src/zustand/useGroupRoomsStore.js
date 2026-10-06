import { create } from 'zustand';

function roomFromCall(call, extra = {}) {
  if (!call?.id || !call.conversationId) return null;
  return {
    callId: call.id,
    conversationId: call.conversationId,
    mediaType: call.mediaType === 'VIDEO' ? 'VIDEO' : 'AUDIO',
    status: call.status || 'ACTIVE',
    participants: Array.isArray(call.participants) ? call.participants : [],
    participantCount:
      typeof call.participantCount === 'number'
        ? call.participantCount
        : (call.participants || []).length,
    conversationName: call.conversationName || extra.conversationName || null,
    caller: call.caller || extra.caller || null,
  };
}

function roomFromEnvelope(envelope) {
  if (!envelope?.callId || !envelope.conversationId) return null;
  if (envelope.kind && envelope.kind !== 'GROUP') return null;
  return {
    callId: envelope.callId,
    conversationId: envelope.conversationId,
    mediaType: envelope.mediaType === 'VIDEO' ? 'VIDEO' : 'AUDIO',
    status: envelope.status || 'ACTIVE',
    participants: Array.isArray(envelope.participants)
      ? envelope.participants
      : [],
    participantCount:
      typeof envelope.participantCount === 'number'
        ? envelope.participantCount
        : (envelope.participants || []).length,
    conversationName: envelope.conversationName || null,
    caller: envelope.caller || null,
  };
}

export const useGroupRoomsStore = create((set, get) => ({
  byConversationId: {},

  upsertFromCall: (call) => {
    const room = roomFromCall(call);
    if (!room || call.kind !== 'GROUP') return;
    set((state) => ({
      byConversationId: {
        ...state.byConversationId,
        [room.conversationId]: room,
      },
    }));
  },

  upsertFromEnvelope: (envelope) => {
    const room = roomFromEnvelope(envelope);
    if (!room) return;
    set((state) => ({
      byConversationId: {
        ...state.byConversationId,
        [room.conversationId]: room,
      },
    }));
  },

  removeByConversationId: (conversationId) => {
    if (!conversationId) return;
    set((state) => {
      if (!state.byConversationId[conversationId]) return state;
      const next = { ...state.byConversationId };
      delete next[conversationId];
      return { byConversationId: next };
    });
  },

  removeByCallId: (callId) => {
    if (!callId) return;
    const entry = Object.values(get().byConversationId).find(
      (room) => room.callId === callId,
    );
    if (entry) get().removeByConversationId(entry.conversationId);
  },

  getByConversationId: (conversationId) =>
    get().byConversationId[conversationId] || null,
}));
