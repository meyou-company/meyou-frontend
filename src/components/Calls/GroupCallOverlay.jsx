import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  LuMic,
  LuMicOff,
  LuMonitor,
  LuMonitorOff,
  LuVideo,
  LuVideoOff,
  LuVolume2,
} from 'react-icons/lu';
import { ConnectionState, RoomEvent, Track } from 'livekit-client';
import {
  adoptSharedCallRoom,
  createDefaultCallRoom,
  getSharedCallRoomSession,
  isCameraNotReadableError,
  isCameraStartInFlight,
  isLocalCameraLive,
  releaseSharedCallRoom,
  setLocalCameraEnabled,
} from '../../utils/callRoomSession';
import { useCallsStore } from '../../zustand/useCallsStore';

function displayName(user, fallback = '') {
  if (!user) return fallback;
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || fallback;
}

function initials(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function mapConnectError(err, t) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('permission') || msg.includes('notallowed') || msg.includes('denied')) {
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

function collectParticipantTiles(room, localUserId, call) {
  if (!room) return [];
  const tiles = [];
  const local = room.localParticipant;
  if (local) {
    tiles.push({
      identity: local.identity || localUserId || 'local',
      name: local.name || tFallback(call, localUserId, local.identity),
      avatarUrl: avatarFor(call, local.identity || localUserId),
      isLocal: true,
      participant: local,
    });
  }
  for (const remote of room.remoteParticipants.values()) {
    tiles.push({
      identity: remote.identity,
      name: remote.name || tFallback(call, remote.identity, remote.identity),
      avatarUrl: avatarFor(call, remote.identity),
      isLocal: false,
      participant: remote,
    });
  }
  return tiles;
}

function tFallback(call, identity, fallback) {
  const users = [
    call?.caller,
    ...(Array.isArray(call?.participants) ? call.participants : []),
  ];
  const match = users.find((u) => u?.id === identity);
  return displayName(match, fallback);
}

function avatarFor(call, identity) {
  const users = [
    call?.caller,
    ...(Array.isArray(call?.participants) ? call.participants : []),
  ];
  return users.find((u) => u?.id === identity)?.avatarUrl || null;
}

function ParticipantTile({ tile, speaking, showVideo, youLabel }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const participant = tile.participant;
    if (!participant) return undefined;

    const attach = () => {
      let video = false;
      participant.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.kind === Track.Kind.Video && videoRef.current) {
          pub.track.attach(videoRef.current);
          if (!pub.isMuted) video = true;
        }
        if (
          pub.kind === Track.Kind.Audio &&
          !tile.isLocal &&
          audioRef.current
        ) {
          pub.track.attach(audioRef.current);
        }
      });
      setHasVideo(video);
    };

    attach();
    return () => {
      participant.trackPublications.forEach((pub) => {
        try {
          pub.track?.detach();
        } catch {
          /* ignore */
        }
      });
    };
  }, [tile.participant, tile.isLocal, tile.identity]);

  return (
    <div
      className={`callGroupTile${speaking ? ' is-speaking' : ''}${
        showVideo ? ' is-video' : ' is-audio'
      }`}
    >
      <video
        ref={videoRef}
        className={`callGroupTile__video${hasVideo && showVideo ? '' : ' is-hidden'}`}
        autoPlay
        playsInline
        muted={tile.isLocal}
      />
      <audio ref={audioRef} autoPlay playsInline />
      {(!showVideo || !hasVideo) && (
        <div className="callGroupTile__avatar" aria-hidden="true">
          {tile.avatarUrl ? (
            <img src={tile.avatarUrl} alt="" />
          ) : (
            <span>{initials(tile.name)}</span>
          )}
        </div>
      )}
      <span className="callGroupTile__name">
        {tile.name}
        {tile.isLocal ? ` (${youLabel})` : ''}
      </span>
    </div>
  );
}

export default function GroupCallOverlay({
  call,
  media,
  mediaType,
  localUserId,
  micEnabled,
  cameraEnabled,
  compact,
  onMicChange,
  onCameraChange,
  onConnectionStatus,
  onLeave,
  onMinimize,
  onExpand,
  onFatalError,
}) {
  const { t } = useTranslation();
  const roomRef = useRef(null);
  const connectGenRef = useRef(0);
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

  const [isConnected, setIsConnected] = useState(false);
  const [statusLabel, setStatusLabel] = useState(t('messenger.calls.connecting'));
  const [tiles, setTiles] = useState([]);
  const [speakingIds, setSpeakingIds] = useState(() => new Set());
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [speakerSupported, setSpeakerSupported] = useState(false);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [cameraError, setCameraError] = useState(null);

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

  const isVideo =
    (mediaType || call?.mediaType) === 'VIDEO' || Boolean(cameraEnabled);

  useEffect(() => {
    let cancelled = false;
    const url = media?.url;
    const token = media?.token;
    const callId = call?.id;
    const roomName = media?.roomName;

    if (!url || !token) {
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

    const syncTiles = () => {
      setTiles(
        collectParticipantTiles(
          room,
          localUserIdRef.current,
          callRef.current,
        ),
      );
    };

    const markConnected = () => {
      if (cancelled || connectGenRef.current !== gen) return;
      setIsConnected(true);
      setStatusLabel(tRef.current('messenger.calls.inCall'));
      onConnectionStatusRef.current?.('connected');
      syncTiles();
    };

    const onConnection = (state) => {
      if (state === ConnectionState.Connected) markConnected();
      else if (state === ConnectionState.Reconnecting) {
        setStatusLabel(tRef.current('messenger.calls.reconnecting'));
        onConnectionStatusRef.current?.('reconnecting');
      } else if (state === ConnectionState.Disconnected) {
        setIsConnected(false);
        setStatusLabel(tRef.current('messenger.calls.disconnected'));
        onConnectionStatusRef.current?.('disconnected');
      }
    };

    const onSpeakers = (speakers) => {
      setSpeakingIds(new Set((speakers || []).map((s) => s.identity)));
    };

    room.on(RoomEvent.Connected, markConnected);
    room.on(RoomEvent.ConnectionStateChanged, onConnection);
    room.on(RoomEvent.ParticipantConnected, syncTiles);
    room.on(RoomEvent.ParticipantDisconnected, syncTiles);
    room.on(RoomEvent.TrackSubscribed, syncTiles);
    room.on(RoomEvent.TrackUnsubscribed, syncTiles);
    room.on(RoomEvent.TrackMuted, syncTiles);
    room.on(RoomEvent.TrackUnmuted, syncTiles);
    room.on(RoomEvent.LocalTrackPublished, syncTiles);
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);

    (async () => {
      if (
        reused &&
        (room.state === ConnectionState.Connected ||
          room.state === ConnectionState.Connecting)
      ) {
        if (room.state === ConnectionState.Connected) markConnected();
        return;
      }

      try {
        await room.connect(url, token);
        if (getSharedCallRoomSession()?.room !== room) return;
        try {
          await room.startAudio();
        } catch {
          /* autoplay */
        }
        const micOn = Boolean(micEnabledRef.current);
        await room.localParticipant.setMicrophoneEnabled(micOn);
        const wantVideo =
          (mediaTypeRef.current || callRef.current?.mediaType) === 'VIDEO' ||
          Boolean(cameraEnabledRef.current);
        if (wantVideo) {
          try {
            await setLocalCameraEnabled(room, true);
          } catch (err) {
            setCameraError(
              isCameraNotReadableError(err) ? 'not-readable' : 'failed',
            );
            onCameraChangeRef.current?.(false);
          }
        }
        if (!cancelled && connectGenRef.current === gen) markConnected();
      } catch (err) {
        if (!cancelled && connectGenRef.current === gen) {
          const msg = mapConnectError(err, tRef.current);
          setStatusLabel(msg);
          onFatalErrorRef.current?.(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      room.off(RoomEvent.Connected, markConnected);
      room.off(RoomEvent.ConnectionStateChanged, onConnection);
      room.off(RoomEvent.ParticipantConnected, syncTiles);
      room.off(RoomEvent.ParticipantDisconnected, syncTiles);
      room.off(RoomEvent.TrackSubscribed, syncTiles);
      room.off(RoomEvent.TrackUnsubscribed, syncTiles);
      room.off(RoomEvent.TrackMuted, syncTiles);
      room.off(RoomEvent.TrackUnmuted, syncTiles);
      room.off(RoomEvent.LocalTrackPublished, syncTiles);
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);

      const state = useCallsStore.getState();
      const sameCallStillActive =
        state.call &&
        String(state.call.id ?? '') === String(callId ?? '') &&
        (state.phase === 'active' ||
          state.phase === 'connecting' ||
          state.phase === 'error');

      void releaseSharedCallRoom(room, {
        force: !sameCallStillActive,
        callId,
        reason: sameCallStillActive
          ? 'group overlay cleanup retain'
          : 'group overlay cleanup disconnect',
      });
    };
  }, [media?.url, media?.token, call?.id, media?.roomName]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    void room.localParticipant.setMicrophoneEnabled(Boolean(micEnabled));
  }, [micEnabled]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    if (!cameraEnabled) {
      void setLocalCameraEnabled(room, false);
      return;
    }
    if (isCameraStartInFlight() || isLocalCameraLive(room)) return;
    void setLocalCameraEnabled(room, true).catch((error) => {
      setCameraError(isCameraNotReadableError(error) ? 'not-readable' : 'failed');
      onCameraChangeRef.current?.(false);
    });
  }, [cameraEnabled]);

  useEffect(() => {
    const supported = Boolean(
      typeof HTMLMediaElement !== 'undefined' &&
        HTMLMediaElement.prototype.setSinkId,
    );
    setSpeakerSupported(supported);
    if (!supported || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) =>
        setAudioOutputs(list.filter((d) => d.kind === 'audiooutput')),
      )
      .catch(() => setAudioOutputs([]));
  }, []);

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

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const next = !screenShareOn;
      await room.localParticipant.setScreenShareEnabled(next);
      setScreenShareOn(next);
    } catch {
      setScreenShareOn(false);
    }
  };

  const changeSpeaker = async (event) => {
    const room = roomRef.current;
    const deviceId = event.target.value;
    if (!room || !deviceId) return;
    try {
      await room.switchActiveDevice('audiooutput', deviceId);
    } catch {
      /* unsupported */
    }
  };

  const title =
    call?.conversationName ||
    t(
      isVideo
        ? 'messenger.calls.groupVideoRoom'
        : 'messenger.calls.groupAudioRoom',
    );
  const count = tiles.length || call?.participantCount || 1;

  const body = (
    <div
      className={`callOverlay callOverlay--group${compact ? ' is-mini' : ' callOverlay--active'}`}
      role="dialog"
      aria-modal={!compact}
    >
      {compact ? (
        <button
          type="button"
          className="callMiniBar"
          onClick={onExpand}
        >
          <span className="callMiniBar__icon" aria-hidden="true">
            {isVideo ? '🎥' : '🔊'}
          </span>
          <span className="callMiniBar__text">
            {title}
            <small>
              {t('messenger.calls.groupParticipantsNow', { count })}
            </small>
          </span>
          <span className="callMiniBar__status">
            {isConnected ? t('messenger.calls.inCall') : statusLabel}
          </span>
        </button>
      ) : (
        <div className="callActive callActive--group">
          <div className="callGroup__top">
            <h2 className="callOverlay__name">{title}</h2>
            <p className="callOverlay__hint">
              {t('messenger.calls.groupParticipantsNow', { count })}
              {' · '}
              {isConnected ? t('messenger.calls.inCall') : statusLabel}
            </p>
            <button
              type="button"
              className="callGroup__back"
              onClick={onMinimize}
            >
              {t('messenger.calls.backToChat')}
            </button>
          </div>

          <div className={`callGroupGrid${isVideo ? ' is-video' : ' is-audio'}`}>
            {tiles.map((tile) => (
              <ParticipantTile
                key={tile.identity}
                tile={tile}
                speaking={speakingIds.has(tile.identity)}
                showVideo={isVideo}
                youLabel={t('messenger.calls.you')}
              />
            ))}
          </div>

          <div className="callActive__footer">
            {cameraError ? (
              <p className="callActive__cameraErrorBody">
                {t('messenger.calls.cameraBusyTitle')}
              </p>
            ) : null}
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
                {micEnabled ? <LuMic /> : <LuMicOff />}
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
                {cameraEnabled ? <LuVideo /> : <LuVideoOff />}
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
                className={`callOverlay__ctrl${screenShareOn ? '' : ' is-off'}`}
                onClick={() => void toggleScreenShare()}
                aria-label={t('messenger.calls.screenShare')}
              >
                {screenShareOn ? <LuMonitorOff /> : <LuMonitor />}
              </button>
              {speakerSupported && audioOutputs.length > 1 ? (
                <label className="callOverlay__ctrl callOverlay__ctrl--select">
                  <LuVolume2 aria-hidden="true" />
                  <select
                    aria-label={t('messenger.calls.speaker')}
                    onChange={(e) => void changeSpeaker(e)}
                  >
                    {audioOutputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || t('messenger.calls.speaker')}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                className="callOverlay__ctrl callOverlay__ctrl--end"
                onClick={onLeave}
                aria-label={t('messenger.calls.leaveRoom')}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}
