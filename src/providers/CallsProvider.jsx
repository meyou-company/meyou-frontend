import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import ActiveCallOverlay from '../components/Calls/ActiveCallOverlay';
import IncomingCallModal from '../components/Calls/IncomingCallModal';
import OutgoingCallScreen from '../components/Calls/OutgoingCallScreen';
import { CALL_SOCKET_EVENTS } from '../constants/callEvents';
import { isPublicPath } from '../constants/publicRoutes';
import { useCallSounds } from '../hooks/useCallSounds';
import { getSessionAccessToken } from '../services/api';
import { callsApi } from '../services/callsApi';
import { connectSocket } from '../services/socket';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { useAuthStore } from '../zustand/useAuthStore';
import { useCallsStore } from '../zustand/useCallsStore';
import '../components/Calls/Calls.scss';

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
  const {
    playIncoming,
    playOutgoing,
    playEnded,
    stopRinging,
    needsUnlock,
    dismissUnlockHint,
  } = useCallSounds();

  const canConnectSocket =
    !isAuthLoading &&
    isAuthed &&
    Boolean(user) &&
    Boolean(token) &&
    !isPublicPath(location.pathname);

  const clearCall = useCallback(() => {
    stopRinging();
    useCallsStore.getState().reset();
    endingRef.current = false;
  }, [stopRinging]);

  // Ring / ringback follows call phase (single instance, no stacked loops).
  useEffect(() => {
    if (phase === 'incoming') {
      void playIncoming();
      return undefined;
    }
    if (phase === 'outgoing') {
      void playOutgoing();
      return undefined;
    }
    stopRinging();
    return undefined;
  }, [phase, playIncoming, playOutgoing, stopRinging]);

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
      console.log('[CALL EVENT]', 'call.incoming', envelope);
      const next = envelopeToCall(envelope);
      if (!next) {
        console.warn('[CALL EVENT] call.incoming ignored: bad payload');
        return;
      }
      const state = useCallsStore.getState();
      if (state.call?.id === next.id) {
        console.log('[CALL EVENT] call.incoming deduped same callId');
        return;
      }
      if (state.phase !== 'idle' && state.call?.id !== next.id) {
        console.warn('[CALL EVENT] call.incoming blocked busy phase=', state.phase);
        toast.error(t('messenger.calls.busyLocal'));
        return;
      }
      useCallsStore.getState().setIncoming({ call: next });
      console.log('[CALL EVENT] setIncoming phase=incoming callId=', next.id);
    };

    const onAccepted = (envelope) => {
      console.log('[CALL EVENT]', 'call.accepted', envelope);
      const next = envelopeToCall(envelope);
      if (!next) return;
      const state = useCallsStore.getState();
      if (
        state.call &&
        String(state.call.id ?? '') !== String(next.id ?? '')
      )
        return;

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
      console.log('[CALL EVENT]', envelope?.event, envelope);
      const callId = envelope?.callId;
      if (!callId) return;
      const state = useCallsStore.getState();
      if (
        state.call &&
        String(state.call.id ?? '') !== String(callId ?? '')
      )
        return;

      stopRinging();
      // Local hangup already played end tone via handleEnd (endingRef set).
      if (envelope.event === 'call.ended' && !endingRef.current) {
        void playEnded();
      }

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
  }, [canConnectSocket, token, clearCall, t, stopRinging, playEnded]);

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
    if (!error) return undefined;
    // Media/connect errors must NOT auto-hangup or remount ActiveCallOverlay.
    // Remount would disconnect LiveKit and reconnect in a loop.
    toast.error(error);
    useCallsStore.getState().setConnectionStatus('failed');
    useCallsStore.setState({ error: null });
    return undefined;
  }, [error]);

  const handleAccept = async () => {
    const callId = call?.id || useCallsStore.getState().call?.id;
    console.log('[CALL UI] accept click', { callId, phase });
    if (!callId) {
      toast.error(t('messenger.calls.acceptFailed'));
      return;
    }
    stopRinging();
    try {
      const data = await callsApi.accept(callId);
      console.log('[CALL UI] accept ok', data?.call?.id);
      useCallsStore.getState().setActive({
        call: data.call,
        media: data.media,
        role: 'callee',
      });
    } catch (e) {
      console.error('[CALL UI] accept failed', e);
      toast.error(getApiErrorMessage(e) || t('messenger.calls.acceptFailed'));
      clearCall();
    }
  };

  const handleReject = () => {
    const callId = call?.id || useCallsStore.getState().call?.id;
    console.log('[CALL UI] reject click', { callId, phase });
    if (!callId) return;
    stopRinging();
    void hangupRemote(callId, 'reject');
  };
  const handleCancel = () => {
    const callId = call?.id || useCallsStore.getState().call?.id;
    console.log('[CALL UI] cancel click', { callId, phase });
    if (!callId) return;
    stopRinging();
    void hangupRemote(callId, 'cancel');
  };
  const handleEnd = () => {
    const callId = call?.id || useCallsStore.getState().call?.id;
    console.log('[CALL UI] end click', { callId, phase });
    if (!callId) return;
    stopRinging();
    void playEnded();
    void hangupRemote(callId, 'end');
  };

  const unlockHint = needsUnlock ? (
    <button
      type="button"
      className="callSoundUnlock"
      onClick={() => {
        dismissUnlockHint();
        if (phase === 'incoming') void playIncoming();
        else if (phase === 'outgoing') void playOutgoing();
      }}
    >
      {t('messenger.calls.enableSound')}
    </button>
  ) : null;

  if (phase === 'incoming' && call) {
    return (
      <>
        {unlockHint}
        <IncomingCallModal
          call={call}
          onAccept={() => void handleAccept()}
          onReject={handleReject}
        />
      </>
    );
  }

  if (phase === 'outgoing' && call) {
    return (
      <>
        {unlockHint}
        <OutgoingCallScreen
          call={call}
          mediaType={mediaType}
          connectionStatus={connectionStatus}
          onCancel={handleCancel}
        />
      </>
    );
  }

  if (
    (phase === 'connecting' || phase === 'active' || phase === 'error') &&
    call &&
    media?.token
  ) {
    return (
      <>
        {unlockHint}
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
      </>
    );
  }

  if (phase === 'connecting' && call) {
    return (
      <>
        {unlockHint}
        <OutgoingCallScreen
          call={call}
          mediaType={mediaType}
          connectionStatus="connecting"
          onCancel={handleCancel}
        />
      </>
    );
  }

  return unlockHint;
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
