import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  createGroupCallRoom,
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

function userIdOf(user) {
  return user?.id || user?.userId || '';
}

function usersFromCall(call) {
  const list = [];
  const add = (user) => {
    const id = userIdOf(user);
    if (!id || list.some((row) => row.id === id)) return;
    list.push({
      id,
      name: displayName(user, id),
      avatarUrl: user?.avatarUrl || null,
    });
  };
  add(call?.caller);
  if (Array.isArray(call?.participants)) {
    for (const row of call.participants) {
      add(row?.id ? row : row?.user);
    }
  }
  return list;
}

function collectParticipantTiles(room, localUserId, call) {
  const tiles = [];
  const seen = new Set();
  const roster = usersFromCall(call);
  const livekitById = new Map();
  const local = room?.localParticipant;
  const localIdentity = local?.identity || localUserId || '';
  if (local && localIdentity) {
    livekitById.set(localIdentity, { participant: local, isLocal: true });
  }
  if (room?.remoteParticipants) {
    for (const remote of room.remoteParticipants.values()) {
      if (!remote?.identity || livekitById.has(remote.identity)) continue;
      livekitById.set(remote.identity, { participant: remote, isLocal: false });
    }
  }

  const pushTile = (identity, isLocal, participant) => {
    if (!identity || seen.has(identity)) return;
    seen.add(identity);
    const rosterUser = roster.find((user) => user.id === identity);
    tiles.push({
      identity,
      name:
        participant?.name ||
        rosterUser?.name ||
        tFallback(call, identity, identity),
      avatarUrl: rosterUser?.avatarUrl || avatarFor(call, identity),
      isLocal,
      participant: participant || null,
    });
  };

  if (localIdentity) {
    pushTile(localIdentity, true, local || null);
  } else if (localUserId) {
    pushTile(localUserId, true, null);
  }

  for (const [identity, entry] of livekitById) {
    if (identity === localIdentity) continue;
    pushTile(identity, false, entry.participant);
  }

  for (const user of roster) {
    if (user.id === localIdentity || user.id === localUserId) continue;
    pushTile(user.id, false, livekitById.get(user.id)?.participant || null);
  }

  tiles.sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    return String(a.identity).localeCompare(String(b.identity));
  });
  return tiles;
}

function cameraPublication(participant) {
  return participant?.getTrackPublication?.(Track.Source.Camera) || null;
}

function publicationHasLiveCamera(pub) {
  if (!pub || pub.source !== Track.Source.Camera || !pub.track) return false;
  const readyState = pub.track.mediaStreamTrack?.readyState;
  return !pub.isMuted && readyState !== 'ended';
}

function ensureRemoteCameraSubscribed(participant) {
  const pub = cameraPublication(participant);
  if (!pub || pub.isSubscribed !== false) return;
  if (typeof pub.setSubscribed === 'function') {
    try {
      pub.setSubscribed(true);
    } catch {
      /* ignore */
    }
  }
}

function detachTrackFromElement(track, element) {
  if (!track || !element) return;
  try {
    track.detach(element);
  } catch {
    /* ignore */
  }
}

function screenShareSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }
  if (!window.isSecureContext) return { ok: false, reason: 'insecure' };
  if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') {
    return { ok: false, reason: 'unsupported' };
  }
  return { ok: true, reason: '' };
}

function isScreenShareCancelError(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    name === 'AbortError' ||
    message.includes('abort') ||
    message.includes('cancel') ||
    message.includes('dismiss')
  );
}

function tFallback(call, identity, fallback) {
  const match = usersFromCall(call).find((user) => user.id === identity);
  return match?.name || fallback;
}

function avatarFor(call, identity) {
  return usersFromCall(call).find((user) => user.id === identity)?.avatarUrl || null;
}

function getGroupGridCols(count, narrow) {
  const n = Math.max(1, Number(count) || 1);
  if (n === 1) return 1;
  if (n === 2) return narrow ? 1 : 2;
  if (n <= 4) return 2;
  if (narrow) return n <= 6 ? 2 : 3;
  if (n <= 9) return 3;
  return Math.min(4, Math.ceil(Math.sqrt(n)));
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

function ParticipantTile({ tile, speaking, youLabel, layoutKey }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const participantSid = tile.participant?.sid || '';

  useLayoutEffect(() => {
    const participant = tile.participant;

    const sync = () => {
      const videoEl = videoRef.current;
      const audioEl = audioRef.current;
      if (!participant) {
        setHasVideo(false);
        return;
      }
      if (!tile.isLocal) ensureRemoteCameraSubscribed(participant);
      const cam = cameraPublication(participant);
      if (cam?.track && videoEl) {
        cam.track.attach(videoEl);
      }
      const live = publicationHasLiveCamera(cam);
      setHasVideo(live);
      if (tile.isLocal) {
        console.log('GROUP LOCAL CAMERA DISPLAY', {
          identity: tile.identity,
          hasVideo: live,
          pubMuted: cam?.isMuted ?? null,
          readyState: cam?.track?.mediaStreamTrack?.readyState ?? null,
          attached: Boolean(videoEl?.srcObject),
          trackSid: cam?.trackSid ?? cam?.track?.sid ?? null,
        });
      }
      if (!tile.isLocal) {
        const mic = participant.getTrackPublication?.(Track.Source.Microphone);
        if (mic?.track && audioEl) mic.track.attach(audioEl);
      }
    };

    sync();
    if (!participant) return undefined;
    const unbind = bindParticipantMedia(participant, sync);
    return () => {
      unbind();
      const cam = cameraPublication(participant);
      detachTrackFromElement(cam?.track, videoRef.current);
      const mic = participant.getTrackPublication?.(Track.Source.Microphone);
      detachTrackFromElement(mic?.track, audioRef.current);
    };
  }, [tile.identity, tile.isLocal, participantSid]);

  useLayoutEffect(() => {
    const participant = tile.participant;
    const videoEl = videoRef.current;
    const cam = cameraPublication(participant);
    if (cam?.track && videoEl) {
      cam.track.attach(videoEl);
    }
  }, [layoutKey, tile.identity, participantSid]);

  return (
    <div
      className={`callGroupTile${speaking ? ' is-speaking' : ''}${
        hasVideo ? ' is-video' : ' is-audio'
      }`}
    >
      <video
        ref={videoRef}
        className={`callGroupTile__video${hasVideo ? '' : ' is-hidden'}`}
        autoPlay
        playsInline
        muted={tile.isLocal}
      />
      <audio ref={audioRef} autoPlay playsInline />
      {!hasVideo && (
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
      const videoEl = videoRef.current;
      const audioEl = audioRef.current;
      participant.trackPublications.forEach((pub) => {
        if (pub.source === Track.Source.ScreenShare) {
          detachTrackFromElement(pub.track, videoEl);
        } else if (pub.source === Track.Source.ScreenShareAudio) {
          detachTrackFromElement(pub.track, audioEl);
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
  const [screenShareError, setScreenShareError] = useState(null);
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [narrowViewport, setNarrowViewport] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 720px)').matches
      : false,
  );

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
      createRoom: createGroupCallRoom,
    });
    roomRef.current = room;

    const syncParticipants = () => {
      setTiles(
        collectParticipantTiles(
          room,
          localUserIdRef.current,
          callRef.current,
        ),
      );
    };

    const syncScreen = () => {
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

    const syncRoster = () => {
      syncParticipants();
      syncScreen();
    };

    const onScreenTrack = (trackOrPub, maybePub) => {
      const source = maybePub?.source || trackOrPub?.source;
      if (isScreenShareSource(source)) syncScreen();
    };

    const markConnected = () => {
      if (cancelled || connectGenRef.current !== gen) return;
      setIsConnected(true);
      setStatusLabel(tRef.current('messenger.calls.inCall'));
      onConnectionStatusRef.current?.('connected');
      syncRoster();
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
    room.on(RoomEvent.ParticipantConnected, syncRoster);
    room.on(RoomEvent.ParticipantDisconnected, syncRoster);
    room.on(RoomEvent.TrackSubscribed, onScreenTrack);
    room.on(RoomEvent.TrackUnsubscribed, onScreenTrack);
    room.on(RoomEvent.TrackPublished, onScreenTrack);
    room.on(RoomEvent.TrackUnpublished, onScreenTrack);
    room.on(RoomEvent.LocalTrackPublished, onScreenTrack);
    room.on(RoomEvent.LocalTrackUnpublished, onScreenTrack);
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
      room.off(RoomEvent.ParticipantConnected, syncRoster);
      room.off(RoomEvent.ParticipantDisconnected, syncRoster);
      room.off(RoomEvent.TrackSubscribed, onScreenTrack);
      room.off(RoomEvent.TrackUnsubscribed, onScreenTrack);
      room.off(RoomEvent.TrackPublished, onScreenTrack);
      room.off(RoomEvent.TrackUnpublished, onScreenTrack);
      room.off(RoomEvent.LocalTrackPublished, onScreenTrack);
      room.off(RoomEvent.LocalTrackUnpublished, onScreenTrack);
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
      setCameraError(null);
      return;
    }
    if (isCameraStartInFlight() || isLocalCameraLive(room)) return;
    void setLocalCameraEnabled(room, true)
      .then(() => {
        setCameraError(null);
      })
      .catch((error) => {
        setCameraError(isCameraNotReadableError(error) ? 'not-readable' : 'failed');
        onCameraChangeRef.current?.(false);
      });
  }, [cameraEnabled, isConnected]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    setTiles(
      collectParticipantTiles(room, localUserId, call),
    );
  }, [call, localUserId, isConnected]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const apply = () => setNarrowViewport(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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

  const screenShareCapability = screenShareSupport();
  const screenShareBlockedReason = !screenShareCapability.ok
    ? t(
        screenShareCapability.reason === 'insecure'
          ? 'messenger.calls.screenShareInsecure'
          : 'messenger.calls.screenShareUnsupported',
      )
    : '';

  const toggleScreenShare = async () => {
    if (screenShareBlockedReason || screenShareBusy) return;
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      setScreenShareError(t('messenger.calls.screenShareNotConnected'));
      return;
    }
    setScreenShareBusy(true);
    setScreenShareError(null);
    const next = !screenShareOn;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      const pub = room.localParticipant.getTrackPublication(
        Track.Source.ScreenShare,
      );
      const live = Boolean(pub?.track && !pub.isMuted);
      setScreenShareOn(next ? live : false);
      setScreenShares(
        collectScreenShares(room, callRef.current, localUserIdRef.current),
      );
    } catch (error) {
      if (isScreenShareCancelError(error)) {
        setScreenShareOn(false);
        setScreenShares(
          collectScreenShares(room, callRef.current, localUserIdRef.current),
        );
        return;
      }
      const name = String(error?.name || '');
      const message = String(error?.message || '').toLowerCase();
      if (name === 'NotAllowedError' || message.includes('permission')) {
        setScreenShareError(t('messenger.calls.screenSharePermissionDenied'));
      } else if (name === 'NotSupportedError' || message.includes('support')) {
        setScreenShareError(t('messenger.calls.screenShareUnsupported'));
      } else {
        setScreenShareError(t('messenger.calls.screenShareFailed'));
      }
      setScreenShareOn(false);
      setScreenShares(
        collectScreenShares(room, callRef.current, localUserIdRef.current),
      );
    } finally {
      setScreenShareBusy(false);
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
  const count = tiles.length || 1;
  const gridCols = getGroupGridCols(count, narrowViewport);
  const hasScreenShare = screenShares.length > 0;
  const layoutKey = `${gridCols}:${hasScreenShare ? 1 : 0}:${count}`;

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
            hasScreenShare ? ' has-screen' : ''
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

          <div className="callGroup__stage">
            {hasScreenShare ? (
              <div className="callGroup__screenStage">
                {screenShares.map((share) => (
                  <ScreenSharePane
                    key={`share-${share.identity}`}
                    share={share}
                    youLabel={t('messenger.calls.you')}
                    sharingLabel={t('messenger.calls.screenShare')}
                  />
                ))}
              </div>
            ) : null}

            <div
              className="callGroupGrid is-video"
              data-count={count}
              style={{ '--group-cols': gridCols }}
            >
              {tiles.map((tile) => (
                <ParticipantTile
                  key={tile.isLocal ? `local-${tile.identity}` : `remote-${tile.identity}`}
                  tile={tile}
                  speaking={speakingIds.has(tile.identity)}
                  youLabel={t('messenger.calls.you')}
                  layoutKey={layoutKey}
                />
              ))}
            </div>
          </div>

          <div className="callActive__footer">
            {cameraError ? (
              <p className="callActive__cameraErrorBody">
                {t('messenger.calls.cameraBusyTitle')}
              </p>
            ) : null}
            {screenShareError ? (
              <p className="callActive__cameraErrorBody">{screenShareError}</p>
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
                disabled={Boolean(screenShareBlockedReason) || screenShareBusy}
                title={
                  screenShareBlockedReason ||
                  (screenShareOn
                    ? t('messenger.calls.stopScreenShare')
                    : t('messenger.calls.screenShare'))
                }
                aria-label={
                  screenShareOn
                    ? t('messenger.calls.stopScreenShare')
                    : t('messenger.calls.screenShare')
                }
                aria-pressed={screenShareOn}
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
