import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuMic, LuMicOff, LuVideo, LuVideoOff } from 'react-icons/lu';
import {
  ConnectionState,
  RoomEvent,
  Track,
} from 'livekit-client';
import {
  adoptSharedCallRoom,
  createDefaultCallRoom,
  getCallDisconnectReasonName,
  releaseSharedCallRoom,
} from '../../utils/callRoomSession';
import { useCallsStore } from '../../zustand/useCallsStore';
import './Calls.scss';

function displayName(user) {
  if (!user) return '';
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || '';
}

function mapConnectError(err, t) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (
    msg.includes('permission') ||
    msg.includes('notallowed') ||
    msg.includes('denied')
  ) {
    return t('messenger.calls.permissionDenied');
  }
  if (msg.includes('notfound') || msg.includes('device')) {
    return t('messenger.calls.deviceMissing');
  }
  if (
    msg.includes('network') ||
    msg.includes('websocket') ||
    msg.includes('timeout') ||
    msg.includes('connection')
  ) {
    return t('messenger.calls.networkError');
  }
  return t('messenger.calls.connectFailed');
}

function formatDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  if (hh > 0) return `${two(hh)}:${two(mm)}:${two(ss)}`;
  return `${two(mm)}:${two(ss)}`;
}

export default function ActiveCallOverlay({
  call,
  media,
  mediaType,
  localUserId,
  micEnabled,
  cameraEnabled,
  onMicChange,
  onCameraChange,
  onConnectionStatus,
  onEnd,
  onFatalError,
}) {
  const { t } = useTranslation();
  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const stageRef = useRef(null);
  const connectGenRef = useRef(0);
  const connectedAtRef = useRef(null);
  const durationTimerRef = useRef(null);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    width: 0,
    height: 0,
    moved: false,
  });

  const [statusLabel, setStatusLabel] = useState(t('messenger.calls.connecting'));
  const [isConnected, setIsConnected] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [remoteName, setRemoteName] = useState('');
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState(false);
  const [isLocalVideoMain, setIsLocalVideoMain] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const isConnectedRef = useRef(false);

  const initialPeer =
    localUserId && call?.callerId === localUserId
      ? call?.callee
      : call?.caller;

  const [peerUser, setPeerUser] = useState(initialPeer);

  // Stable refs so room lifecycle effect never re-runs on UI/callback changes.
  const tRef = useRef(t);
  const callRef = useRef(call);
  const mediaTypeRef = useRef(mediaType);
  const localUserIdRef = useRef(localUserId);
  const micEnabledRef = useRef(micEnabled);
  const cameraEnabledRef = useRef(cameraEnabled);
  const onMicChangeRef = useRef(onMicChange);
  const onCameraChangeRef = useRef(onCameraChange);
  const onConnectionStatusRef = useRef(onConnectionStatus);
  const onFatalErrorRef = useRef(onFatalError);

  useEffect(() => {
    tRef.current = t;
    callRef.current = call;
    mediaTypeRef.current = mediaType;
    localUserIdRef.current = localUserId;
    micEnabledRef.current = micEnabled;
    cameraEnabledRef.current = cameraEnabled;
    onMicChangeRef.current = onMicChange;
    onCameraChangeRef.current = onCameraChange;
    onConnectionStatusRef.current = onConnectionStatus;
    onFatalErrorRef.current = onFatalError;
  });

  useEffect(() => {
    if (!call) return;
    setPeerUser(
      localUserId && call.callerId === localUserId ? call.callee : call.caller,
    );
  }, [call, localUserId]);

  useEffect(() => {
    console.log('ACTIVE CALL OVERLAY MOUNT', {
      callId: call?.id,
      hasToken: Boolean(media?.token),
      hasUrl: Boolean(media?.url),
      mediaRoomName: media?.roomName,
    });
    return () => {
      console.trace('ACTIVE CALL OVERLAY UNMOUNT/CLEANUP', {
        callId: call?.id,
      });
    };
  }, [call?.id, media?.token, media?.url, media?.roomName]);

  useEffect(() => {
    console.log('ACTIVE CALL OVERLAY MEDIA DEPS', {
      callId: call?.id,
      callIdType: typeof call?.id,
      url: media?.url,
      roomName: media?.roomName,
      tokenTail: media?.token ? String(media.token).slice(-8) : null,
    });
  }, [call?.id, media?.url, media?.token, media?.roomName]);

  // Effect A — Room lifecycle only (stable deps: url/token/callId).
  useEffect(() => {
    let cancelled = false;
    const url = media?.url;
    const token = media?.token;
    const callId = call?.id;
    const roomName = media?.roomName;

    console.log('CALL ROOM EFFECT MOUNT', {
      callId,
      roomName,
      hasUrl: Boolean(url),
      hasToken: Boolean(token),
      tokenTail: token ? String(token).slice(-8) : null,
    });

    if (!url || !token) {
      console.warn('CALL CONNECT START aborted: missing url/token', {
        hasUrl: Boolean(url),
        hasToken: Boolean(token),
      });
      onFatalErrorRef.current?.(tRef.current('messenger.calls.connectFailed'));
      return undefined;
    }

    const gen = ++connectGenRef.current;
    const { room, reused } = adoptSharedCallRoom({
      callId,
      url,
      token,
      roomName,
      createRoom: createDefaultCallRoom,
    });
    roomRef.current = room;

    console.log(reused ? 'CALL ROOM REUSE' : 'CALL ROOM CONNECT', {
      callId,
      roomName,
      url,
      identity: localUserIdRef.current,
      mediaType: mediaTypeRef.current || callRef.current?.mediaType,
      roomState: room.state,
      gen,
      reused,
    });

    const clearDurationTimer = () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };

    const detectRemoteVideoTrack = () => {
      const remote = [...room.remoteParticipants.values()][0];
      if (!remote) return false;
      const publications = [...remote.trackPublications.values()];
      return publications.some((pub) => {
        if (pub.kind !== Track.Kind.Video) return false;
        if (pub.source !== Track.Source.Camera) return false;
        if (!pub.track) return false;
        if (pub.isMuted) return false;
        return true;
      });
    };

    const syncRemoteVideoState = (reason) => {
      const hasVideo = detectRemoteVideoTrack();
      setHasRemoteVideoTrack(hasVideo);
      console.log('REMOTE CAMERA STATE', {
        reason,
        hasVideo,
        participants: room.remoteParticipants.size,
      });
    };

    const markConnected = () => {
      if (cancelled || connectGenRef.current !== gen) return;
      console.log('CALL CONNECTED', {
        callId,
        roomState: room.state,
        localIdentity: room.localParticipant?.identity,
        remoteCount: room.remoteParticipants.size,
      });
      connectedAtRef.current = Date.now();
      isConnectedRef.current = true;
      setIsConnected(true);
      setStatusLabel(tRef.current('messenger.calls.inCall'));
      onConnectionStatusRef.current?.('connected');
      if (!durationTimerRef.current) {
        setDurationSec(0);
        durationTimerRef.current = setInterval(() => {
          if (!connectedAtRef.current) return;
          setDurationSec(
            Math.floor((Date.now() - connectedAtRef.current) / 1000),
          );
        }, 1000);
      }
    };

    const attachRemote = () => {
      const remote = [...room.remoteParticipants.values()][0];
      if (!remote) {
        setRemoteName('');
        setHasRemoteVideoTrack(false);
        return;
      }
      console.log('REMOTE PARTICIPANT JOINED', {
        identity: remote.identity,
        name: remote.name,
        publications: [...remote.trackPublications.keys()],
      });
      setRemoteName(remote.name || remote.identity);
      const currentCall = callRef.current;
      if (currentCall?.caller?.id === remote.identity) {
        setPeerUser(currentCall.caller);
      } else if (currentCall?.callee?.id === remote.identity) {
        setPeerUser(currentCall.callee);
      }

      remote.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
          pub.track.attach(remoteVideoRef.current);
          console.log('REMOTE TRACK ATTACHED', {
            kind: pub.kind,
            source: pub.source,
          });
        }
        if (pub.kind === Track.Kind.Audio && remoteAudioRef.current) {
          pub.track.attach(remoteAudioRef.current);
        }
      });
      syncRemoteVideoState('attachRemote');
    };

    const onTrackSubscribed = (track, publication, participant) => {
      console.log('REMOTE TRACK SUBSCRIBED', {
        kind: track.kind,
        source: publication?.source,
        participant: participant?.identity,
      });
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
        console.log('REMOTE TRACK ATTACHED', {
          kind: track.kind,
          source: publication?.source,
          participant: participant?.identity,
        });
      }
      if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
      syncRemoteVideoState('TrackSubscribed');
    };

    const onTrackUnsubscribed = (track, publication, participant) => {
      console.log('REMOTE TRACK UNSUBSCRIBED', {
        kind: track?.kind,
        source: publication?.source,
        participant: participant?.identity,
      });
      if (track?.kind === Track.Kind.Video && remoteVideoRef.current) {
        try {
          track.detach(remoteVideoRef.current);
        } catch {
          /* ignore detach issues */
        }
      }
      syncRemoteVideoState('TrackUnsubscribed');
    };

    const onTrackMuted = (publication, participant) => {
      console.log('REMOTE TRACK MUTED', {
        kind: publication?.kind,
        source: publication?.source,
        participant: participant?.identity,
      });
      syncRemoteVideoState('TrackMuted');
    };

    const onTrackUnmuted = (publication, participant) => {
      console.log('REMOTE TRACK UNMUTED', {
        kind: publication?.kind,
        source: publication?.source,
        participant: participant?.identity,
      });
      syncRemoteVideoState('TrackUnmuted');
    };

    const onConnection = (state) => {
      console.log('ROOM STATE', {
        state,
        roomState: room.state,
        remotes: room.remoteParticipants.size,
      });
      if (state === ConnectionState.Connected) {
        markConnected();
      } else if (state === ConnectionState.Reconnecting) {
        console.log('CALL ROOM RECONNECTING', { callId });
        setStatusLabel(tRef.current('messenger.calls.reconnecting'));
        onConnectionStatusRef.current?.('reconnecting');
      } else if (state === ConnectionState.Disconnected) {
        console.log('CALL ROOM DISCONNECT EVENT', {
          callId,
          reason: 'ConnectionState.Disconnected',
          roomState: room.state,
        });
        clearDurationTimer();
        isConnectedRef.current = false;
        setIsConnected(false);
        setStatusLabel(tRef.current('messenger.calls.disconnected'));
        onConnectionStatusRef.current?.('disconnected');
        setHasRemoteVideoTrack(false);
      } else if (
        state === ConnectionState.Connecting ||
        state === ConnectionState.SignalReconnecting
      ) {
        if (!isConnectedRef.current) {
          setStatusLabel(tRef.current('messenger.calls.connecting'));
          onConnectionStatusRef.current?.('connecting');
        }
      }
    };

    const onParticipantDisconnected = () => {
      // Do NOT clearCall / hangup — LiveKit transport events are not Messenger call end.
      syncRemoteVideoState('ParticipantDisconnected');
    };

    const onDisconnected = (reason) => {
      console.log('CALL ROOM DISCONNECT EVENT', {
        callId,
        reason,
        reasonName: getCallDisconnectReasonName(reason),
        roomState: room.state,
        via: 'RoomEvent',
      });
    };

    room.on(RoomEvent.Connected, markConnected);
    room.on(RoomEvent.ConnectionStateChanged, onConnection);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.TrackMuted, onTrackMuted);
    room.on(RoomEvent.TrackUnmuted, onTrackUnmuted);
    room.on(RoomEvent.ParticipantConnected, attachRemote);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    const onReconnecting = () => {
      console.log('CALL ROOM RECONNECTING event', { callId });
    };
    const onReconnected = () => {
      console.log('CALL ROOM RECONNECTED event', { callId });
      markConnected();
      attachRemote();
    };
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);

    let connectTimeout = null;

    (async () => {
      // Remount / StrictMode: never call connect() again while LiveKit is
      // already connecting or connected — that unpublishes tracks and loops.
      if (
        reused &&
        (room.state === ConnectionState.Connected ||
          room.state === ConnectionState.Connecting ||
          room.state === ConnectionState.Reconnecting ||
          room.state === ConnectionState.SignalReconnecting)
      ) {
        console.log('CALL ROOM skip connect — session already in flight', {
          callId,
          roomState: room.state,
          gen,
        });
        if (room.state === ConnectionState.Connected) {
          markConnected();
          attachRemote();
        }
        return;
      }

      try {
        const wantVideo =
          (mediaTypeRef.current || callRef.current?.mediaType) === 'VIDEO';
        const micOn = Boolean(micEnabledRef.current);
        const camOn = Boolean(cameraEnabledRef.current);

        connectTimeout = setTimeout(() => {
          if (room.state !== ConnectionState.Connected) {
            console.warn('CALL CONNECT TIMEOUT', {
              roomState: room.state,
              callId,
            });
            setStatusLabel(tRef.current('messenger.calls.connectTimeout'));
            onFatalErrorRef.current?.(
              tRef.current('messenger.calls.connectTimeout'),
            );
          }
        }, 25_000);

        await room.connect(url, token);
        if (cancelled || connectGenRef.current !== gen) {
          // Another effect generation owns the session; do not tear down shared room.
          console.log('CALL ROOM stale connect generation ignored', {
            callId,
            gen,
            currentGen: connectGenRef.current,
            cancelled,
          });
          return;
        }

        console.log('CALL CONNECT promise resolved', {
          roomState: room.state,
          roomName: room.name,
          localIdentity: room.localParticipant?.identity,
        });

        try {
          await room.startAudio();
        } catch (e) {
          console.warn('CALL startAudio blocked', e);
        }

        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }

        if (room.state === ConnectionState.Connected) {
          markConnected();
        }

        console.log('LOCAL TRACK CREATED (requesting mic/cam)', {
          wantVideo,
          micEnabled: micOn,
          cameraEnabled: camOn,
        });
        await room.localParticipant.setMicrophoneEnabled(micOn);
        console.log('LOCAL TRACK PUBLISHED', {
          source: 'microphone',
          enabled: micOn,
          publication: Boolean(
            room.localParticipant.getTrackPublication(Track.Source.Microphone),
          ),
        });

        if (wantVideo || camOn) {
          await room.localParticipant.setCameraEnabled(camOn);
          const camPub = room.localParticipant.getTrackPublication(
            Track.Source.Camera,
          );
          console.log('LOCAL TRACK PUBLISHED', {
            source: 'camera',
            enabled: camOn,
            publication: Boolean(camPub),
          });
          if (camPub?.track && localVideoRef.current) {
            camPub.track.attach(localVideoRef.current);
          }
        }

        attachRemote();
      } catch (err) {
        console.error('CALL CONNECT FAILED', {
          message: err?.message || String(err),
          name: err?.name,
          roomState: room.state,
        });
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        if (!cancelled && connectGenRef.current === gen) {
          const msg = mapConnectError(err, tRef.current);
          setStatusLabel(msg);
          setIsConnected(false);
          onFatalErrorRef.current?.(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (connectTimeout) clearTimeout(connectTimeout);

      room.off(RoomEvent.Connected, markConnected);
      room.off(RoomEvent.ConnectionStateChanged, onConnection);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(RoomEvent.TrackMuted, onTrackMuted);
      room.off(RoomEvent.TrackUnmuted, onTrackUnmuted);
      room.off(RoomEvent.ParticipantConnected, attachRemote);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);

      const state = useCallsStore.getState();
      const sameCallStillActive =
        state.call &&
        String(state.call.id ?? '') === String(callId ?? '') &&
        state.media?.url === url &&
        (state.media?.roomName == null ||
          roomName == null ||
          state.media.roomName === roomName) &&
        (state.phase === 'active' ||
          state.phase === 'connecting' ||
          state.phase === 'error');

      console.log('CALL ROOM CLEANUP', {
        callId,
        reason: 'effect cleanup',
        roomState: room.state,
        gen,
        sameCallStillActive,
      });

      if (sameCallStillActive) {
        // Remount / StrictMode / transient parent rerender — keep LiveKit room.
        releaseSharedCallRoom(room, {
          force: false,
          callId,
          reason: 'effect cleanup (retain shared session)',
        });
        return;
      }

      clearDurationTimer();
      releaseSharedCallRoom(room, {
        force: true,
        callId,
        reason: 'effect cleanup → room.disconnect()',
      });
      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
  }, [media?.url, media?.token, call?.id]);

  // Effect B — local mic toggle (no reconnect).
  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    void room.localParticipant.setMicrophoneEnabled(Boolean(micEnabled));
  }, [micEnabled]);

  // Effect B — local camera toggle (no reconnect).
  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    void room.localParticipant
      .setCameraEnabled(Boolean(cameraEnabled))
      .then(() => {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track && localVideoRef.current) {
          pub.track.attach(localVideoRef.current);
        }
        console.log('LOCAL CAMERA ENABLE RESULT', {
          requestedEnabled: Boolean(cameraEnabled),
          hasPublication: Boolean(pub),
          publicationSource: pub?.source,
          publicationMuted: pub?.isMuted,
          hasTrack: Boolean(pub?.track),
          trackEnabled: pub?.track?.mediaStreamTrack?.enabled,
        });
      })
      .catch((error) => {
        console.error('LOCAL CAMERA ENABLE FAILED', error);
      });
  }, [cameraEnabled]);

  const switchCamera = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const track = pub?.track;
      if (track && typeof track.restartTrack === 'function') {
        const facingMode =
          track.mediaStreamTrack?.getSettings?.()?.facingMode === 'environment'
            ? 'user'
            : 'environment';
        await track.restartTrack({ facingMode });
      }
    } catch {
      /* unsupported */
    }
  };

  const name = displayName(peerUser) || remoteName || t('messenger.calls.unknown');
  const showVideoUi =
    (mediaType || call?.mediaType) === 'VIDEO' ||
    Boolean(cameraEnabled) ||
    Boolean(hasRemoteVideoTrack);
  const mainSource = isLocalVideoMain ? 'local' : 'remote';
  const previewSource = isLocalVideoMain ? 'remote' : 'local';
  const hasLocalVideo = Boolean(cameraEnabled);
  const hasRemoteVideo = Boolean(hasRemoteVideoTrack);
  const mainHasVideo = mainSource === 'local' ? hasLocalVideo : hasRemoteVideo;
  const previewHasVideo = previewSource === 'local' ? hasLocalVideo : hasRemoteVideo;
  const previewSwapLabel = 'Показати це відео великим';
  const PREVIEW_DRAG_THRESHOLD = 8;
  const PREVIEW_STAGE_PADDING = 16;
  const PREVIEW_BOTTOM_RESERVED = 120;

  const handleSwapVideos = () => {
    setIsLocalVideoMain((prev) => !prev);
  };

  const clampPreviewPosition = (x, y, width, height) => {
    const stage = stageRef.current;
    if (!stage) return { x, y };
    const rect = stage.getBoundingClientRect();
    const maxX = Math.max(
      PREVIEW_STAGE_PADDING,
      rect.width - width - PREVIEW_STAGE_PADDING,
    );
    const maxY = Math.max(
      PREVIEW_STAGE_PADDING,
      rect.height - height - PREVIEW_BOTTOM_RESERVED,
    );
    return {
      x: Math.min(Math.max(PREVIEW_STAGE_PADDING, x), maxX),
      y: Math.min(Math.max(PREVIEW_STAGE_PADDING, y), maxY),
    };
  };

  const handlePreviewPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    const targetRect = event.currentTarget.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const originX = targetRect.left - stageRect.left;
    const originY = targetRect.top - stageRect.top;

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX,
      originY,
      width: targetRect.width,
      height: targetRect.height,
      moved: false,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDraggingPreview(true);
  };

  const handlePreviewPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) >= PREVIEW_DRAG_THRESHOLD) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    const nextX = drag.originX + dx;
    const nextY = drag.originY + dy;
    const clamped = clampPreviewPosition(nextX, nextY, drag.width, drag.height);
    setPreviewPosition(clamped);
    event.preventDefault();
  };

  const finishPreviewPointer = (event) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current.active = false;
    setIsDraggingPreview(false);

    if (!drag.moved) {
      handleSwapVideos();
    }
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !previewPosition) return undefined;

    const clampOnResize = () => {
      const clamped = clampPreviewPosition(
        previewPosition.x,
        previewPosition.y,
        dragRef.current.width || 112,
        dragRef.current.height || 160,
      );
      if (clamped.x !== previewPosition.x || clamped.y !== previewPosition.y) {
        setPreviewPosition(clamped);
      }
    };

    const observer = new ResizeObserver(clampOnResize);
    observer.observe(stage);
    window.addEventListener('orientationchange', clampOnResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', clampOnResize);
    };
  }, [previewPosition]);

  const previewDragProps = {
    onPointerDown: handlePreviewPointerDown,
    onPointerMove: handlePreviewPointerMove,
    onPointerUp: finishPreviewPointer,
    onPointerCancel: finishPreviewPointer,
    style: previewPosition
      ? {
          left: `${previewPosition.x}px`,
          top: `${previewPosition.y}px`,
          right: 'auto',
          bottom: 'auto',
        }
      : undefined,
    role: 'button',
    tabIndex: 0,
    'aria-label': previewSwapLabel,
    title: previewSwapLabel,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSwapVideos();
      }
    },
  };

  return createPortal(
    <div className="callOverlay callOverlay--active" role="dialog" aria-modal="true">
      <div className="callActive">
        <div className="callActive__stage" ref={stageRef}>
          <video
            ref={remoteVideoRef}
            className={`callActive__remoteVideo${
              isLocalVideoMain ? ' is-preview' : ' is-main'
            }${hasRemoteVideo ? '' : ' is-hidden'}${
              isLocalVideoMain ? ' callActive__previewDraggable' : ''
            }${isLocalVideoMain && isDraggingPreview ? ' is-dragging' : ''}`}
            autoPlay
            playsInline
            {...(isLocalVideoMain ? previewDragProps : {})}
          />
          {showVideoUi && !hasRemoteVideo && isLocalVideoMain ? (
            <button
              type="button"
              className={`callActive__videoFallback callActive__videoFallback--preview callActive__previewDraggable${
                isDraggingPreview ? ' is-dragging' : ''
              }`}
              {...previewDragProps}
            >
              <div className="callOverlay__avatar" aria-hidden="true">
                {peerUser?.avatarUrl ? (
                  <img src={peerUser.avatarUrl} alt="" />
                ) : (
                  <span>{name.charAt(0).toUpperCase() || '?'}</span>
                )}
              </div>
            </button>
          ) : null}
          <audio ref={remoteAudioRef} autoPlay playsInline />
          {!showVideoUi || (showVideoUi && !mainHasVideo) ? (
            <div className="callActive__audioFallback">
              <div
                className="callOverlay__avatar callOverlay__avatar--lg"
                aria-hidden="true"
              >
                {mainSource === 'remote' && peerUser?.avatarUrl ? (
                  <img src={peerUser.avatarUrl} alt="" />
                ) : (
                  <span>
                    {mainSource === 'remote'
                      ? name.charAt(0).toUpperCase() || '?'
                      : 'Y'}
                  </span>
                )}
              </div>
            </div>
          ) : null}
          <video
            ref={localVideoRef}
            className={`callActive__localVideo${
              isLocalVideoMain ? ' is-main' : ' is-preview'
            }${hasLocalVideo ? '' : ' is-hidden'}${
              !isLocalVideoMain ? ' callActive__previewDraggable' : ''
            }${!isLocalVideoMain && isDraggingPreview ? ' is-dragging' : ''}`}
            autoPlay
            playsInline
            muted
            {...(!isLocalVideoMain ? previewDragProps : {})}
          />
          {showVideoUi && !hasLocalVideo && !isLocalVideoMain ? (
            <button
              type="button"
              className={`callActive__videoFallback callActive__videoFallback--preview callActive__previewDraggable${
                isDraggingPreview ? ' is-dragging' : ''
              }`}
              {...previewDragProps}
            >
              <div className="callOverlay__avatar" aria-hidden="true">
                <span>Y</span>
              </div>
            </button>
          ) : null}
        </div>

        <div className="callActive__meta">
          <h2 className="callOverlay__name">{name}</h2>
          <p className="callOverlay__hint">
            {isConnected ? formatDuration(durationSec) : statusLabel}
          </p>
        </div>

        <div className="callActive__controls">
          <button
            type="button"
            className={`callOverlay__ctrl${micEnabled ? '' : ' is-off'}`}
            onClick={() => onMicChange?.(!micEnabled)}
            title={
              micEnabled
                ? t('messenger.calls.muteMic')
                : t('messenger.calls.unmuteMic')
            }
            aria-label={
              micEnabled
                ? t('messenger.calls.muteMic')
                : t('messenger.calls.unmuteMic')
            }
          >
            {micEnabled ? <LuMic aria-hidden="true" /> : <LuMicOff aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="callOverlay__ctrl"
            onClick={() => onCameraChange?.(!cameraEnabled)}
            title={
              cameraEnabled
                ? t('messenger.calls.cameraOff')
                : t('messenger.calls.cameraOn')
            }
            aria-label={
              cameraEnabled
                ? t('messenger.calls.cameraOff')
                : t('messenger.calls.cameraOn')
            }
          >
            {cameraEnabled ? (
              <LuVideo aria-hidden="true" />
            ) : (
              <LuVideoOff aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="callOverlay__ctrl"
            onClick={() => void switchCamera()}
            aria-label={t('messenger.calls.switchCamera')}
          >
            🔄
          </button>
          <button
            type="button"
            className="callOverlay__ctrl callOverlay__ctrl--end"
            onClick={onEnd}
            aria-label={t('messenger.calls.end')}
          >
            ✕
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
