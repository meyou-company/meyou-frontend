import { ConnectionState, Room, Track } from 'livekit-client';

/** Shared across remounts so Effect A/B cannot start two camera captures. */
let cameraEnableInFlight = null;
let teardownInFlight = null;
let teardownRoom = null;

/**
 * Survives React remounts / StrictMode so we do not
 * disconnect → empty room → ROOM_DELETED → reconnect loops.
 */
let sharedSession = null;

export function getCallDisconnectReasonName(reason) {
  const map = {
    0: 'UNKNOWN_REASON',
    1: 'CLIENT_INITIATED',
    2: 'DUPLICATE_IDENTITY',
    3: 'SERVER_SHUTDOWN',
    4: 'PARTICIPANT_REMOVED',
    5: 'ROOM_DELETED',
    6: 'STATE_MISMATCH',
    7: 'JOIN_FAILURE',
    8: 'MIGRATION',
    9: 'SIGNAL_CLOSE',
    10: 'ROOM_CLOSED',
    11: 'USER_UNAVAILABLE',
    12: 'USER_REJECTED',
    13: 'SIP_TRUNK_FAILURE',
    14: 'CONNECTION_TIMEOUT',
    15: 'MEDIA_FAILURE',
  };
  if (reason == null) return 'undefined';
  if (typeof reason === 'string') return reason;
  return map[reason] || `UNKNOWN(${reason})`;
}

export function buildCallRoomKey(callId, url, roomName) {
  // Do not include JWT — getActive() mints a new token every time and that
  // must not look like a different LiveKit session.
  return `${String(callId ?? '')}::${String(url ?? '')}::${String(roomName ?? '')}`;
}

export function getSharedCallRoomSession() {
  return sharedSession;
}

export function adoptSharedCallRoom({
  callId,
  url,
  token,
  roomName,
  createRoom,
}) {
  const key = buildCallRoomKey(callId, url, roomName);
  if (
    sharedSession &&
    sharedSession.key === key &&
    sharedSession.room &&
    sharedSession.room.state !== ConnectionState.Disconnected
  ) {
    // Keep latest token on the session object for debugging only.
    sharedSession.token = token ?? sharedSession.token;
    return { room: sharedSession.room, reused: true, key };
  }

  if (sharedSession?.room) {
    const previous = sharedSession.room;
    const previousCallId = sharedSession.callId;
    sharedSession = null;
    void teardownCallRoom(previous, {
      callId: previousCallId,
      reason: 'replacing shared session',
    });
  }

  const room = createRoom();
  sharedSession = {
    key,
    callId,
    url,
    token,
    roomName,
    room,
    initialCameraLock: false,
  };
  return { room, reused: false, key };
}

export async function releaseSharedCallRoom(
  room,
  { force = false, callId, reason } = {},
) {
  if (!room) return false;
  if (!force && sharedSession?.room === room) {
    // Keep alive for remount with same session.
    console.log('CALL ROOM CLEANUP skip disconnect — shared session retained', {
      callId,
      reason,
      roomState: room.state,
    });
    return false;
  }

  if (sharedSession?.room === room) {
    sharedSession = null;
  }
  await teardownCallRoom(room, { callId, reason });
  return true;
}

export async function clearSharedCallRoom(reason = 'clear') {
  const session = sharedSession;
  sharedSession = null;
  if (!session?.room) return;
  await teardownCallRoom(session.room, {
    callId: session.callId,
    reason,
  });
}

export function cameraTrackSnapshot(room) {
  const pub = room?.localParticipant?.getTrackPublication(Track.Source.Camera);
  const track = pub?.track?.mediaStreamTrack;
  return {
    roomState: room?.state ?? null,
    participantIdentity: room?.localParticipant?.identity ?? null,
    hasCameraPublication: Boolean(pub),
    trackSid: pub?.trackSid ?? pub?.track?.sid ?? null,
    source: pub?.source ?? null,
    readyState: track?.readyState ?? null,
    enabled: typeof track?.enabled === 'boolean' ? track.enabled : null,
    muted:
      typeof track?.muted === 'boolean'
        ? track.muted
        : typeof pub?.isMuted === 'boolean'
          ? pub.isMuted
          : null,
  };
}

export function isCameraStartInFlight() {
  return Boolean(cameraEnableInFlight);
}

export function isLocalCameraLive(room) {
  const pub = room?.localParticipant?.getTrackPublication(Track.Source.Camera);
  const readyState = pub?.track?.mediaStreamTrack?.readyState;
  return Boolean(pub?.track && readyState === 'live' && !pub.isMuted);
}

export function isCameraNotReadableError(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    name === 'NotReadableError' ||
    message.includes('notreadable') ||
    message.includes('could not start video source')
  );
}

export async function setLocalCameraEnabled(room, enabled) {
  if (!room?.localParticipant) return null;

  if (!enabled) {
    if (cameraEnableInFlight) {
      try {
        await cameraEnableInFlight;
      } catch {
        /* previous start failed; still disable if a pub exists */
      }
    }
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!pub) return null;
    return room.localParticipant.setCameraEnabled(false);
  }

  if (isLocalCameraLive(room)) {
    return room.localParticipant.getTrackPublication(Track.Source.Camera);
  }

  if (cameraEnableInFlight) {
    console.log('CAMERA START SKIPPED - ALREADY IN FLIGHT', cameraTrackSnapshot(room));
    return cameraEnableInFlight;
  }

  cameraEnableInFlight = (async () => {
    let devices = null;
    try {
      const list = await navigator.mediaDevices?.enumerateDevices?.();
      devices = (list || [])
        .filter((item) => item.kind === 'videoinput' || item.kind === 'audioinput')
        .map((item) => ({ kind: item.kind, label: item.label || '' }));
    } catch {
      devices = null;
    }

    console.log('CAMERA START REQUEST', {
      ...cameraTrackSnapshot(room),
      cameraEnabled: true,
      devices,
    });

    try {
      const publication = await room.localParticipant.setCameraEnabled(true);
      console.log('CAMERA START SUCCESS', {
        ...cameraTrackSnapshot(room),
        trackSid: publication?.trackSid ?? publication?.track?.sid ?? null,
        source: publication?.source ?? Track.Source.Camera,
        readyState: publication?.track?.mediaStreamTrack?.readyState ?? null,
      });
      return publication;
    } catch (error) {
      console.error('CAMERA START FAILED', {
        ...cameraTrackSnapshot(room),
        errorName: error?.name || null,
        errorMessage: error?.message || String(error),
      });
      throw error;
    } finally {
      cameraEnableInFlight = null;
    }
  })();

  return cameraEnableInFlight;
}

async function teardownCallRoom(room, { callId, reason } = {}) {
  if (!room) return;
  if (teardownInFlight && teardownRoom === room) {
    return teardownInFlight;
  }

  teardownRoom = room;
  teardownInFlight = runTeardownCallRoom(room, { callId, reason }).finally(() => {
    if (teardownRoom === room) {
      teardownInFlight = null;
      teardownRoom = null;
    }
  });
  return teardownInFlight;
}

async function runTeardownCallRoom(room, { callId, reason } = {}) {
  if (cameraEnableInFlight) {
    try {
      await cameraEnableInFlight;
    } catch {
      /* ignore failed start during hangup */
    }
  }

  const local = room.localParticipant;
  const cameraPub = local?.getTrackPublication(Track.Source.Camera);
  const micPub = local?.getTrackPublication(Track.Source.Microphone);
  const cameraTrack = cameraPub?.track?.mediaStreamTrack;
  const micTrack = micPub?.track?.mediaStreamTrack;

  console.log('CAMERA CLEANUP', {
    reason,
    callId,
    roomState: room.state,
    participantIdentity: local?.identity ?? null,
    hasCameraPublication: Boolean(cameraPub),
    cameraReadyStateBefore: cameraTrack?.readyState ?? null,
    microphoneReadyStateBefore: micTrack?.readyState ?? null,
  });

  if (room.state !== ConnectionState.Disconnected && local) {
    try {
      if (cameraPub) await local.setCameraEnabled(false);
    } catch (error) {
      console.warn('CAMERA CLEANUP setCameraEnabled(false) failed', error);
    }
    try {
      if (micPub) await local.setMicrophoneEnabled(false);
    } catch (error) {
      console.warn('CAMERA CLEANUP setMicrophoneEnabled(false) failed', error);
    }
    try {
      await room.disconnect();
    } catch (error) {
      console.warn('CAMERA CLEANUP disconnect failed', error);
    }
  }

  console.log('CAMERA CLEANUP', {
    reason: `${reason || 'teardown'} after`,
    callId,
    roomState: room.state,
    participantIdentity: local?.identity ?? null,
    hasCameraPublication: Boolean(
      local?.getTrackPublication(Track.Source.Camera),
    ),
    cameraReadyStateAfter: cameraTrack?.readyState ?? null,
    microphoneReadyStateAfter: micTrack?.readyState ?? null,
  });
}

export function createDefaultCallRoom() {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: { autoGainControl: true, echoCancellation: true },
  });
}
