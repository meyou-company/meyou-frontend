import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import ActiveCallOverlay from '../components/Calls/ActiveCallOverlay';
import IncomingCallModal from '../components/Calls/IncomingCallModal';
import OutgoingCallScreen from '../components/Calls/OutgoingCallScreen';
import { CALL_SOCKET_EVENTS } from '../constants/callEvents';
import { isPublicPath } from '../constants/publicRoutes';
import { getSessionAccessToken } from '../services/api';
import { callsApi } from '../services/callsApi';
import { connectSocket } from '../services/socket';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { useAuthStore } from '../zustand/useAuthStore';
import { useCallsStore } from '../zustand/useCallsStore';

function envelopeToCall(envelope) {
  if (!envelope?.callId) return null;
  return {
    id: envelope.callId,
    conversationId: envelope.conversationId,
    callerId: envelope.caller?.id,
    calleeId: envelope.callee?.id,
    caller: envelope.caller,
    callee: envelope.callee,
    mediaType: envelope.mediaType,
    status: envelope.status,
    createdAt: envelope.createdAt,
    endReason: envelope.endReason ?? null,
  };
}

/**
 * Global call signaling + UI. Mount once next to other socket providers.
 */
export function CallsProvider() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);
  const token = storeToken ?? getSessionAccessToken();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);

  const phase = useCallsStore((s) => s.phase);
  const call = useCallsStore((s) => s.call);
  const media = useCallsStore((s) => s.media);
  const mediaType = useCallsStore((s) => s.mediaType);
  const connectionStatus = useCallsStore((s) => s.connectionStatus);
  const micEnabled = useCallsStore((s) => s.micEnabled);
  const cameraEnabled = useCallsStore((s) => s.cameraEnabled);
  const error = useCallsStore((s) => s.error);

  const endingRef = useRef(false);
  const restoredRef = useRef(false);

  const canConnectSocket =
    !isAuthLoading &&
    isAuthed &&
    Boolean(user) &&
    Boolean(token) &&
    !isPublicPath(location.pathname);

  const clearCall = useCallback(() => {
    useCallsStore.getState().reset();
    endingRef.current = false;
  }, []);

  const hangupRemote = useCallback(async (callId, action = 'end') => {
    if (!callId || endingRef.current) return;
    endingRef.current = true;
    try {
      if (action === 'cancel') await callsApi.cancel(callId);
      else if (action === 'reject') await callsApi.reject(callId);
      else await callsApi.end(callId);
    } catch (e) {
      console.warn('[calls] hangup failed', e);
    } finally {
      clearCall();
    }
  }, [clearCall]);

  // Restore RINGING/ACTIVE after reload (no duplicate incoming event).
  useEffect(() => {
    if (!canConnectSocket || restoredRef.current) return undefined;
    restoredRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const data = await callsApi.getActive();
        if (cancelled || !data?.call) return;
        const active = data.call;
        const role =
          data.role ||
          (active.callerId === user?.id ? 'caller' : 'callee');

        if (active.status === 'RINGING') {
          if (role === 'caller') {
            useCallsStore.getState().setOutgoing({
              call: active,
              media: data.media,
              mediaType: active.mediaType,
            });
          } else {
            useCallsStore.getState().setIncoming({ call: active });
          }
          return;
        }

        if (active.status === 'ACTIVE' && data.media?.token) {
          useCallsStore.getState().setActive({
            call: active,
            media: data.media,
            role,
          });
        }
      } catch (e) {
        console.warn('[calls] restore active failed', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canConnectSocket, user?.id]);

  // Socket signaling
  useEffect(() => {
    if (!canConnectSocket || !token) return undefined;

    const socket = connectSocket(token);
    if (!socket) return undefined;

    const onIncoming = (envelope) => {
      const next = envelopeToCall(envelope);
      if (!next) return;
      const state = useCallsStore.getState();
      if (state.call?.id === next.id) return;
      if (state.phase !== 'idle' && state.call?.id !== next.id) {
        toast.error(t('messenger.calls.busyLocal'));
        return;
      }
      useCallsStore.getState().setIncoming({ call: next });
    };

    const onAccepted = (envelope) => {
      const next = envelopeToCall(envelope);
      if (!next) return;
      const state = useCallsStore.getState();
      if (state.call && state.call.id !== next.id) return;

      if (state.role === 'caller') {
        const apply = (mediaConn) => {
          useCallsStore.getState().setActive({
            call: { ...state.call, ...next, status: 'ACTIVE' },
            media: mediaConn || state.media,
            role: 'caller',
          });
        };
        if (state.media?.token) {
          apply(state.media);
        } else {
          void callsApi.getActive().then((data) => {
            if (data?.call?.id === next.id) apply(data.media);
            else apply(null);
          });
        }
      } else {
        useCallsStore.getState().applyRemoteCallUpdate(next);
      }
    };

    const onTerminal = (envelope) => {
      const callId = envelope?.callId;
      if (!callId) return;
      const state = useCallsStore.getState();
      if (state.call && state.call.id !== callId) return;

      if (envelope.event === 'call.rejected') {
        toast(t('messenger.calls.rejected'));
      } else if (envelope.event === 'call.cancelled') {
        toast(t('messenger.calls.cancelled'));
      } else if (envelope.event === 'call.missed') {
        toast(t('messenger.calls.missed'));
      } else if (envelope.event === 'call.busy') {
        toast.error(t('messenger.calls.busy'));
      } else if (envelope.event === 'call.ended') {
        toast(t('messenger.calls.ended'));
      }
      clearCall();
    };

    const handlers = {
      'call.incoming': onIncoming,
      'call.accepted': onAccepted,
      'call.rejected': onTerminal,
      'call.cancelled': onTerminal,
      'call.ended': onTerminal,
      'call.busy': onTerminal,
      'call.missed': onTerminal,
    };

    for (const event of CALL_SOCKET_EVENTS) {
      socket.on(event, handlers[event]);
    }

    return () => {
      for (const event of CALL_SOCKET_EVENTS) {
        socket.off(event, handlers[event]);
      }
    };
  }, [canConnectSocket, token, clearCall, t]);

  // Tab close / refresh: best-effort end
  useEffect(() => {
    const onUnload = () => {
      const state = useCallsStore.getState();
      const id = state.call?.id;
      if (!id) return;
      if (state.phase === 'outgoing') {
        void callsApi.cancel(id);
      } else if (state.phase === 'incoming') {
        void callsApi.reject(id);
      } else if (state.phase === 'active' || state.phase === 'connecting') {
        void callsApi.end(id);
      }
    };
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, []);

  useEffect(() => {
    if (phase === 'error' && error) {
      toast.error(error);
      const id = useCallsStore.getState().call?.id;
      if (id) void hangupRemote(id, 'end');
      else clearCall();
    }
  }, [phase, error, hangupRemote, clearCall]);

  const handleAccept = async () => {
    if (!call?.id) return;
    try {
      const data = await callsApi.accept(call.id);
      useCallsStore.getState().setActive({
        call: data.call,
        media: data.media,
        role: 'callee',
      });
    } catch (e) {
      toast.error(getApiErrorMessage(e) || t('messenger.calls.acceptFailed'));
      clearCall();
    }
  };

  const handleReject = () => void hangupRemote(call?.id, 'reject');
  const handleCancel = () => void hangupRemote(call?.id, 'cancel');
  const handleEnd = () => void hangupRemote(call?.id, 'end');

  if (phase === 'incoming' && call) {
    return (
      <IncomingCallModal
        call={call}
        onAccept={() => void handleAccept()}
        onReject={handleReject}
      />
    );
  }

  if (phase === 'outgoing' && call) {
    return (
      <OutgoingCallScreen
        call={call}
        mediaType={mediaType}
        connectionStatus={connectionStatus}
        onCancel={handleCancel}
      />
    );
  }

  if (
    (phase === 'connecting' || phase === 'active') &&
    call &&
    media?.token
  ) {
    return (
      <ActiveCallOverlay
        call={call}
        media={media}
        mediaType={mediaType}
        localUserId={user?.id}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onMicChange={(v) => useCallsStore.getState().setMicEnabled(v)}
        onCameraChange={(v) => useCallsStore.getState().setCameraEnabled(v)}
        onConnectionStatus={(s) =>
          useCallsStore.getState().setConnectionStatus(s)
        }
        onEnd={handleEnd}
        onFatalError={(msg) => useCallsStore.getState().setError(msg)}
      />
    );
  }

  if (phase === 'connecting' && call) {
    return (
      <OutgoingCallScreen
        call={call}
        mediaType={mediaType}
        connectionStatus="connecting"
        onCancel={handleCancel}
      />
    );
  }

  return null;
}

/** Start a call from chat UI. */
export async function startConversationCall(conversationId, mediaType) {
  const state = useCallsStore.getState();
  if (state.phase !== 'idle') {
    throw new Error('CALL_BUSY_LOCAL');
  }

  const data = await callsApi.start(conversationId, { mediaType });
  useCallsStore.getState().setOutgoing({
    call: data.call,
    media: data.media,
    mediaType: data.call?.mediaType || mediaType,
  });
  return data;
}
