import { ConnectionState, Room } from 'livekit-client';

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
    console.trace('CALL ROOM disconnect() CALLED', {
      callId: sharedSession.callId,
      reason: 'replacing shared session',
      roomState: sharedSession.room.state,
      prevKey: sharedSession.key,
      nextKey: key,
    });
    try {
      sharedSession.room.disconnect();
    } catch {
      /* ignore */
    }
    sharedSession = null;
  }

  const room = createRoom();
  sharedSession = { key, callId, url, token, roomName, room };
  return { room, reused: false, key };
}

export function releaseSharedCallRoom(room, { force = false, callId, reason } = {}) {
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

  console.trace('CALL ROOM disconnect() CALLED', {
    callId,
    reason,
    roomState: room.state,
    force,
  });
  try {
    room.disconnect();
  } catch {
    /* ignore */
  }
  if (sharedSession?.room === room) {
    sharedSession = null;
  }
  return true;
}

export function clearSharedCallRoom(reason = 'clear') {
  if (!sharedSession?.room) {
    sharedSession = null;
    return;
  }
  console.trace('CALL ROOM disconnect() CALLED', {
    callId: sharedSession.callId,
    reason,
    roomState: sharedSession.room.state,
  });
  try {
    sharedSession.room.disconnect();
  } catch {
    /* ignore */
  }
  sharedSession = null;
}

export function createDefaultCallRoom() {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: { autoGainControl: true, echoCancellation: true },
  });
}
