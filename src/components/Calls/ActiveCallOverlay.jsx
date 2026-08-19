import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuMic, LuMicOff, LuVideo, LuVideoOff } from 'react-icons/lu';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
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
  const connectGenRef = useRef(0);
  const connectedAtRef = useRef(null);
  const durationTimerRef = useRef(null);

  const [statusLabel, setStatusLabel] = useState(t('messenger.calls.connecting'));
  const [isConnected, setIsConnected] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [remoteName, setRemoteName] = useState('');
  const isConnectedRef = useRef(false);

  const initialPeer =
    localUserId && call?.callerId === localUserId
      ? call?.callee
      : call?.caller;

  const [peerUser, setPeerUser] = useState(initialPeer);

  useEffect(() => {
    if (!call) return;
    setPeerUser(
      localUserId && call.callerId === localUserId ? call.callee : call.caller,
    );
  }, [call, localUserId]);

  useEffect(() => {
    let cancelled = false;
    const url = media?.url;
    const token = media?.token;
    if (!url || !token) {
      console.warn('CALL CONNECT START aborted: missing url/token', {
        hasUrl: Boolean(url),
        hasToken: Boolean(token),
      });
      onFatalError?.(t('messenger.calls.connectFailed'));
      return undefined;
    }

    const gen = ++connectGenRef.current;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { autoGainControl: true, echoCancellation: true },
    });
    roomRef.current = room;

    console.log('CALL CONNECT START', {
      callId: call?.id,
      roomName: media?.roomName,
      url,
      identity: localUserId,
      mediaType: mediaType || call?.mediaType,
      gen,
    });

    const clearDurationTimer = () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };

    const markConnected = () => {
      if (cancelled || connectGenRef.current !== gen) return;
      console.log('CALL CONNECTED', {
        callId: call?.id,
        roomState: room.state,
        localIdentity: room.localParticipant?.identity,
        remoteCount: room.remoteParticipants.size,
      });
      connectedAtRef.current = Date.now();
      isConnectedRef.current = true;
      setIsConnected(true);
      setStatusLabel(t('messenger.calls.inCall'));
      onConnectionStatus?.('connected');
      clearDurationTimer();
      setDurationSec(0);
      durationTimerRef.current = setInterval(() => {
        if (!connectedAtRef.current) return;
        setDurationSec(
          Math.floor((Date.now() - connectedAtRef.current) / 1000),
        );
      }, 1000);
    };

    const attachRemote = () => {
      const remote = [...room.remoteParticipants.values()][0];
      if (!remote) {
        setRemoteName('');
        return;
      }
      console.log('REMOTE PARTICIPANT JOINED', {
        identity: remote.identity,
        name: remote.name,
        publications: [...remote.trackPublications.keys()],
      });
      setRemoteName(remote.name || remote.identity);
      if (call?.caller?.id === remote.identity) setPeerUser(call.caller);
      else if (call?.callee?.id === remote.identity) setPeerUser(call.callee);

      remote.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.kind === Track.Kind.Video && remoteVideoRef.current) {
          pub.track.attach(remoteVideoRef.current);
        }
        if (pub.kind === Track.Kind.Audio && remoteAudioRef.current) {
          pub.track.attach(remoteAudioRef.current);
        }
      });
    };

    const onTrackSubscribed = (track, publication, participant) => {
      console.log('REMOTE TRACK SUBSCRIBED', {
        kind: track.kind,
        source: publication?.source,
        participant: participant?.identity,
      });
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      }
      if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
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
        setStatusLabel(t('messenger.calls.reconnecting'));
        onConnectionStatus?.('reconnecting');
      } else if (state === ConnectionState.Disconnected) {
        console.log('CALL DISCONNECTED', { callId: call?.id });
        clearDurationTimer();
        isConnectedRef.current = false;
        setIsConnected(false);
        setStatusLabel(t('messenger.calls.disconnected'));
        onConnectionStatus?.('disconnected');
      } else if (
        state === ConnectionState.Connecting ||
        state === ConnectionState.SignalReconnecting
      ) {
        if (!isConnectedRef.current) {
          setStatusLabel(t('messenger.calls.connecting'));
          onConnectionStatus?.('connecting');
        }
      }
    };

    room.on(RoomEvent.Connected, markConnected);
    room.on(RoomEvent.ConnectionStateChanged, onConnection);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.ParticipantConnected, attachRemote);
    room.on(RoomEvent.Disconnected, () => {
      console.log('CALL DISCONNECTED', { callId: call?.id, via: 'RoomEvent' });
    });

    let connectTimeout = null;

    (async () => {
      try {
        const wantVideo = (mediaType || call?.mediaType) === 'VIDEO';

        connectTimeout = setTimeout(() => {
          if (room.state !== ConnectionState.Connected) {
            console.warn('CALL CONNECT TIMEOUT', {
              roomState: room.state,
              callId: call?.id,
            });
            setStatusLabel(t('messenger.calls.connectTimeout'));
            onFatalError?.(t('messenger.calls.connectTimeout'));
          }
        }, 25_000);

        await room.connect(url, token);
        if (cancelled || connectGenRef.current !== gen) {
          await room.disconnect();
          return;
        }

        console.log('CALL CONNECT promise resolved', {
          roomState: room.state,
          roomName: room.name,
          localIdentity: room.localParticipant?.identity,
        });

        // Browser autoplay policies — unlock audio output after Accept/call gesture.
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

        // Publish via LiveKit helpers (creates LocalAudioTrack / LocalVideoTrack).
        console.log('LOCAL TRACK CREATED (requesting mic/cam)', {
          wantVideo,
          micEnabled,
          cameraEnabled,
        });
        await room.localParticipant.setMicrophoneEnabled(Boolean(micEnabled));
        console.log('LOCAL TRACK PUBLISHED', {
          source: 'microphone',
          enabled: Boolean(micEnabled),
          publication: Boolean(
            room.localParticipant.getTrackPublication(Track.Source.Microphone),
          ),
        });

        if (wantVideo) {
          await room.localParticipant.setCameraEnabled(Boolean(cameraEnabled));
          const camPub = room.localParticipant.getTrackPublication(
            Track.Source.Camera,
          );
          console.log('LOCAL TRACK PUBLISHED', {
            source: 'camera',
            enabled: Boolean(cameraEnabled),
            publication: Boolean(camPub),
          });
          if (camPub?.track && localVideoRef.current) {
            camPub.track.attach(localVideoRef.current);
          }
        } else {
          onCameraChange?.(false);
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
          const msg = mapConnectError(err, t);
          setStatusLabel(msg);
          setIsConnected(false);
          onFatalError?.(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (connectTimeout) clearTimeout(connectTimeout);
      clearDurationTimer();
      console.log('CALL CONNECT cleanup', { gen, callId: call?.id });
      try {
        room.disconnect();
      } catch {
        /* ignore */
      }
      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only when LiveKit token/url changes
  }, [media?.url, media?.token]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    void room.localParticipant.setMicrophoneEnabled(Boolean(micEnabled));
  }, [micEnabled]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    void room.localParticipant.setCameraEnabled(Boolean(cameraEnabled)).then(() => {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track && localVideoRef.current) {
        pub.track.attach(localVideoRef.current);
      }
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
  const showVideoUi = (mediaType || call?.mediaType) === 'VIDEO';

  return createPortal(
    <div className="callOverlay callOverlay--active" role="dialog" aria-modal="true">
      <div className="callActive">
        <div className="callActive__stage">
          <video
            ref={remoteVideoRef}
            className="callActive__remoteVideo"
            autoPlay
            playsInline
          />
          <audio ref={remoteAudioRef} autoPlay playsInline />
          {!showVideoUi ? (
            <div className="callActive__audioFallback">
              <div
                className="callOverlay__avatar callOverlay__avatar--lg"
                aria-hidden="true"
              >
                {peerUser?.avatarUrl ? (
                  <img src={peerUser.avatarUrl} alt="" />
                ) : (
                  <span>{name.charAt(0).toUpperCase() || '?'}</span>
                )}
              </div>
            </div>
          ) : null}
          <video
            ref={localVideoRef}
            className={`callActive__localVideo${cameraEnabled ? '' : ' is-hidden'}`}
            autoPlay
            playsInline
            muted
          />
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
            className={`callOverlay__ctrl${cameraEnabled ? '' : ' is-off'}`}
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
