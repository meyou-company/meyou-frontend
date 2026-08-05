import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
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
    msg.includes('timeout')
  ) {
    return t('messenger.calls.networkError');
  }
  return t('messenger.calls.connectFailed');
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
  const connectingRef = useRef(false);
  const [statusLabel, setStatusLabel] = useState(t('messenger.calls.connecting'));
  const [remoteName, setRemoteName] = useState('');

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
      onFatalError?.(t('messenger.calls.connectFailed'));
      return undefined;
    }
    if (connectingRef.current) return undefined;

    connectingRef.current = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const attachRemote = () => {
      const remote = [...room.remoteParticipants.values()][0];
      if (!remote) {
        setRemoteName('');
        return;
      }
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

    const onTrackSubscribed = (track) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      }
      if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
    };

    const onConnection = (state) => {
      if (state === ConnectionState.Connected) {
        setStatusLabel(t('messenger.calls.connected'));
        onConnectionStatus?.('connected');
      } else if (state === ConnectionState.Reconnecting) {
        setStatusLabel(t('messenger.calls.reconnecting'));
        onConnectionStatus?.('reconnecting');
      } else if (state === ConnectionState.Disconnected) {
        setStatusLabel(t('messenger.calls.disconnected'));
        onConnectionStatus?.('disconnected');
      } else {
        setStatusLabel(t('messenger.calls.connecting'));
        onConnectionStatus?.('connecting');
      }
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.ParticipantConnected, attachRemote);
    room.on(RoomEvent.ConnectionStateChanged, onConnection);

    const connectTimeout = setTimeout(() => {
      if (room.state !== ConnectionState.Connected) {
        onFatalError?.(t('messenger.calls.connectTimeout'));
      }
    }, 25_000);

    (async () => {
      try {
        const wantVideo = (mediaType || call?.mediaType) === 'VIDEO';
        const tracks = await createLocalTracks({
          audio: true,
          video: wantVideo ? { facingMode: 'user' } : false,
        });

        if (cancelled) {
          tracks.forEach((tr) => tr.stop());
          return;
        }

        await room.connect(url, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        for (const track of tracks) {
          if (track.kind === Track.Kind.Audio) {
            await room.localParticipant.publishTrack(track);
            if (!micEnabled) {
              await room.localParticipant.setMicrophoneEnabled(false);
            }
          }
          if (track.kind === Track.Kind.Video) {
            await room.localParticipant.publishTrack(track);
            if (localVideoRef.current) track.attach(localVideoRef.current);
            if (!cameraEnabled) {
              await room.localParticipant.setCameraEnabled(false);
            }
          }
        }

        if (!wantVideo) onCameraChange?.(false);

        attachRemote();
        onConnectionStatus?.('connected');
        setStatusLabel(t('messenger.calls.connected'));
      } catch (err) {
        if (!cancelled) onFatalError?.(mapConnectError(err, t));
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(connectTimeout);
      connectingRef.current = false;
      try {
        room.disconnect();
      } catch {
        /* ignore */
      }
      roomRef.current = null;
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

  return (
    <div className="callOverlay callOverlay--active" role="dialog" aria-modal="true">
      <div className="callActive">
        <div className="callActive__stage">
          <video
            ref={remoteVideoRef}
            className="callActive__remoteVideo"
            autoPlay
            playsInline
          />
          <audio ref={remoteAudioRef} autoPlay />
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
          <p className="callOverlay__hint">{statusLabel}</p>
        </div>

        <div className="callActive__controls">
          <button
            type="button"
            className={`callOverlay__ctrl${micEnabled ? '' : ' is-off'}`}
            onClick={() => onMicChange?.(!micEnabled)}
            aria-label={
              micEnabled
                ? t('messenger.calls.muteMic')
                : t('messenger.calls.unmuteMic')
            }
          >
            {micEnabled ? '🎤' : '🔇'}
          </button>
          <button
            type="button"
            className={`callOverlay__ctrl${cameraEnabled ? '' : ' is-off'}`}
            onClick={() => onCameraChange?.(!cameraEnabled)}
            aria-label={
              cameraEnabled
                ? t('messenger.calls.cameraOff')
                : t('messenger.calls.cameraOn')
            }
          >
            {cameraEnabled ? '📷' : '🚫'}
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
    </div>
  );
}
