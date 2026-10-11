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
import { ConnectionState, ParticipantEvent, RoomEvent, Track } from 'livekit-client';
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

function isScreenShareSource(source) {
  return (
    source === Track.Source.ScreenShare ||
    source === Track.Source.ScreenShareAudio
  );
}

function collectScreenShares(room, call, localUserId) {
  if (!room) return [];
  const shares = [];
  const consider = (participant, isLocal) => {
    if (!participant) return;
    participant.trackPublications.forEach((pub) => {
      if (pub.source !== Track.Source.ScreenShare || !pub.track || pub.isMuted) {
        return;
      }
      const identity = participant.identity || (isLocal ? localUserId : '');
      shares.push({
        identity,
        name: participant.name || tFallback(call, identity, identity),
        isLocal,
        participant,
      });
    });
  };
  consider(room.localParticipant, true);
  for (const remote of room.remoteParticipants.values()) {
    consider(remote, false);
  }
  return shares;
}

function bindParticipantMedia(participant, onChange) {
  if (!participant || typeof participant.on !== 'function') {
    return () => {};
  }
  const events = [
    ParticipantEvent.TrackSubscribed,
    ParticipantEvent.TrackUnsubscribed,
    ParticipantEvent.TrackMuted,
    ParticipantEvent.TrackUnmuted,
    ParticipantEvent.TrackPublished,
    ParticipantEvent.TrackUnpublished,
    ParticipantEvent.LocalTrackPublished,
    ParticipantEvent.LocalTrackUnpublished,
  ];
  events.forEach((event) => participant.on(event, onChange));
  return () => {
    events.forEach((event) => participant.off(event, onChange));
  };
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
        if (!pub.track || isScreenShareSource(pub.source)) return;
        if (pub.source === Track.Source.Camera && videoRef.current) {
          pub.track.attach(videoRef.current);
          if (!pub.isMuted) video = true;
        }
        if (
          pub.source === Track.Source.Microphone &&
          !tile.isLocal &&
          audioRef.current
        ) {
          pub.track.attach(audioRef.current);
        }
      });
      setHasVideo(video);
    };

    attach();
    const unbind = bindParticipantMedia(participant, attach);
    return () => {
      unbind();
      participant.trackPublications.forEach((pub) => {
        if (isScreenShareSource(pub.source)) return;
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

function ScreenSharePane({ share, youLabel, sharingLabel }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const participant = share.participant;
    if (!participant) return undefined;

    const attach = () => {
      participant.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.source === Track.Source.ScreenShare && videoRef.current) {
          pub.track.attach(videoRef.current);
        }
        if (
          pub.source === Track.Source.ScreenShareAudio &&
          !share.isLocal &&
          audioRef.current
        ) {
          pub.track.attach(audioRef.current);
        }
      });
    };

    attach();
    const unbind = bindParticipantMedia(participant, attach);
    const media = participant.getTrackPublication?.(Track.Source.ScreenShare)
      ?.track?.mediaStreamTrack;
    const onEnded = () => attach();
    media?.addEventListener('ended', onEnded);
    return () => {
      unbind();
      media?.removeEventListener('ended', onEnded);
      participant.trackPublications.forEach((pub) => {
        if (!isScreenShareSource(pub.source)) return;
        try {
          pub.track?.detach();
        } catch {
          /* ignore */
        }
      });
    };
  }, [share.participant, share.isLocal, share.identity]);

  return (
    <div className="callGroupScreen">
      <video
        ref={videoRef}
        className="callGroupScreen__video"
        autoPlay
        playsInline
        muted={share.isLocal}
      />
      <audio ref={audioRef} autoPlay playsInline />
      <span className="callGroupScreen__name">
        {share.name}
        {share.isLocal ? ` (${youLabel})` : ''}
        {' · '}
        {sharingLabel}
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
  const [screenShares, setScreenShares] = useState([]);
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

    const syncMedia = () => {
      setTiles(
        collectParticipantTiles(
          room,
          localUserIdRef.current,
          callRef.current,
        ),
      );
      setScreenShares(
        collectScreenShares(room, callRef.current, localUserIdRef.current),
      );
      const localShare = room.localParticipant?.getTrackPublication(
        Track.Source.ScreenShare,
      );
      const sharing = Boolean(localShare?.track && !localShare.isMuted);
      setScreenShareOn(sharing);
      const mediaTrack = localShare?.track?.mediaStreamTrack;
      if (mediaTrack && mediaTrack.readyState !== 'ended') {
        const onBrowserStop = () => {
          void room.localParticipant.setScreenShareEnabled(false).catch(() => {});
          setScreenShareOn(false);
        };
        mediaTrack.addEventListener('ended', onBrowserStop, { once: true });
      }
    };

    const markConnected = () => {
      if (cancelled || connectGenRef.current !== gen) return;
      setIsConnected(true);
      setStatusLabel(tRef.current('messenger.calls.inCall'));
      onConnectionStatusRef.current?.('connected');
      syncMedia();
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
    room.on(RoomEvent.ParticipantConnected, syncMedia);
    room.on(RoomEvent.ParticipantDisconnected, syncMedia);
    room.on(RoomEvent.TrackSubscribed, syncMedia);
    room.on(RoomEvent.TrackUnsubscribed, syncMedia);
    room.on(RoomEvent.TrackPublished, syncMedia);
    room.on(RoomEvent.TrackUnpublished, syncMedia);
    room.on(RoomEvent.TrackMuted, syncMedia);
    room.on(RoomEvent.TrackUnmuted, syncMedia);
    room.on(RoomEvent.LocalTrackPublished, syncMedia);
    room.on(RoomEvent.LocalTrackUnpublished, syncMedia);
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
      room.off(RoomEvent.ParticipantConnected, syncMedia);
      room.off(RoomEvent.ParticipantDisconnected, syncMedia);
      room.off(RoomEvent.TrackSubscribed, syncMedia);
      room.off(RoomEvent.TrackUnsubscribed, syncMedia);
      room.off(RoomEvent.TrackPublished, syncMedia);
      room.off(RoomEvent.TrackUnpublished, syncMedia);
      room.off(RoomEvent.TrackMuted, syncMedia);
      room.off(RoomEvent.TrackUnmuted, syncMedia);
      room.off(RoomEvent.LocalTrackPublished, syncMedia);
      room.off(RoomEvent.LocalTrackUnpublished, syncMedia);
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
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      const next = !screenShareOn;
      await room.localParticipant.setScreenShareEnabled(next);
      const pub = room.localParticipant.getTrackPublication(
        Track.Source.ScreenShare,
      );
      const live = Boolean(pub?.track && !pub.isMuted);
      setScreenShareOn(next ? live : false);
      setScreenShares(
        collectScreenShares(room, callRef.current, localUserIdRef.current),
      );
    } catch {
      setScreenShareOn(false);
      setScreenShares(
        collectScreenShares(room, callRef.current, localUserIdRef.current),
      );
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
        <div
          className={`callActive callActive--group${
            screenShares.length ? ' has-screen' : ''
          }`}
        >
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

          {screenShares.map((share) => (
            <ScreenSharePane
              key={`share-${share.identity}`}
              share={share}
              youLabel={t('messenger.calls.you')}
              sharingLabel={t('messenger.calls.screenShare')}
            />
          ))}

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
