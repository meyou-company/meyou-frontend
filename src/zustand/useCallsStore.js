import { create } from 'zustand';

/**
 * phase:
 *  - idle
 *  - outgoing   (caller, RINGING)
 *  - incoming   (callee, RINGING)
 *  - connecting (joining LiveKit)
 *  - active     (in call)
 *  - error
 */
export const useCallsStore = create((set, get) => ({
  phase: 'idle',
  call: null,
  role: null,
  media: null,
  mediaType: null,
  error: null,
  connectionStatus: 'idle',
  micEnabled: true,
  cameraEnabled: false,

  reset: () =>
    set({
      phase: 'idle',
      call: null,
      role: null,
      media: null,
      mediaType: null,
      error: null,
      connectionStatus: 'idle',
      micEnabled: true,
      cameraEnabled: false,
    }),

  setOutgoing: ({ call, media, mediaType }) =>
    set({
      phase: 'outgoing',
      call,
      role: 'caller',
      media: media ?? null,
      mediaType: mediaType || call?.mediaType || 'AUDIO',
      error: null,
      connectionStatus: 'connecting',
      micEnabled: true,
      cameraEnabled: (mediaType || call?.mediaType) === 'VIDEO',
    }),

  setIncoming: ({ call }) =>
    set({
      phase: 'incoming',
      call,
      role: 'callee',
      media: null,
      mediaType: call?.mediaType || 'AUDIO',
      error: null,
      connectionStatus: 'idle',
      micEnabled: true,
      cameraEnabled: call?.mediaType === 'VIDEO',
    }),

  setConnecting: ({ call, media, role } = {}) =>
    set((state) => ({
      phase: 'connecting',
      call: call ?? state.call,
      media: media ?? state.media,
      role: role ?? state.role,
      mediaType: (call ?? state.call)?.mediaType || state.mediaType,
      error: null,
      connectionStatus: 'connecting',
    })),

  setActive: ({ call, media, role } = {}) =>
    set((state) => {
      const nextCall = call ?? state.call;
      const nextType = nextCall?.mediaType || state.mediaType || 'AUDIO';
      return {
        phase: 'active',
        call: nextCall,
        media: media ?? state.media,
        role: role ?? state.role,
        mediaType: nextType,
        error: null,
        connectionStatus: 'connected',
        cameraEnabled:
          state.phase === 'idle' || state.phase === 'incoming'
            ? nextType === 'VIDEO'
            : state.cameraEnabled,
      };
    }),

  setError: (error) =>
    set({
      phase: 'error',
      error: error || 'Call failed',
      connectionStatus: 'failed',
    }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setMicEnabled: (micEnabled) => set({ micEnabled: Boolean(micEnabled) }),

  setCameraEnabled: (cameraEnabled) =>
    set({ cameraEnabled: Boolean(cameraEnabled) }),

  applyRemoteCallUpdate: (call) => {
    if (!call?.id) return;
    const current = get().call;
    if (current && current.id !== call.id) return;
    set({ call: { ...current, ...call }, mediaType: call.mediaType || get().mediaType });
  },

  clearIfCallId: (callId) => {
    if (!callId || get().call?.id === callId) {
      get().reset();
    }
  },
}));
