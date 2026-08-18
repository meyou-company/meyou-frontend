/** Instagram-style labels for CALL_EVENT chat rows. */

function formatCallDuration(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  if (hh > 0) return `${two(hh)}:${two(mm)}:${two(ss)}`;
  return `${two(mm)}:${two(ss)}`;
}

/** Local clock time from UTC/ISO call timestamp. Never uses Date.now(). */
export function formatCallClockTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export function getCallEventMeta(message) {
  const meta = message?.metadata && typeof message.metadata === 'object'
    ? message.metadata
    : {};
  return {
    callId: meta.callId ?? null,
    callStatus: meta.callStatus ?? null,
    mediaType: meta.mediaType === 'VIDEO' ? 'VIDEO' : 'AUDIO',
    durationSec:
      typeof meta.durationSec === 'number' ? meta.durationSec : null,
    callerId: meta.callerId ?? message?.senderId ?? null,
    calleeId: meta.calleeId ?? null,
    startedAt: meta.startedAt || meta.createdAt || message?.createdAt || null,
  };
}

/** Clock shown above the call row (Messenger-style), not inside the label. */
export function getCallEventClock(message) {
  return formatCallClockTime(getCallEventMeta(message).startedAt);
}

export function formatCallEventLabel(message, t, viewerId) {
  const { callStatus, mediaType, durationSec, callerId } =
    getCallEventMeta(message);
  const isVideo = mediaType === 'VIDEO';
  const isOutgoing =
    viewerId && callerId && String(viewerId) === String(callerId);

  if (callStatus === 'ENDED') {
    let typeLabel;
    if (viewerId && callerId) {
      typeLabel = t(
        isOutgoing
          ? isVideo
            ? 'messenger.calls.chatOutgoingVideo'
            : 'messenger.calls.chatOutgoingAudio'
          : isVideo
            ? 'messenger.calls.chatIncomingVideo'
            : 'messenger.calls.chatIncomingAudio',
      );
    } else {
      typeLabel = isVideo
        ? t('messenger.calls.videoCall')
        : t('messenger.calls.audioCall');
    }

    if (durationSec != null) {
      return t('messenger.calls.chatEndedDuration', {
        type: typeLabel,
        duration: formatCallDuration(durationSec),
      });
    }

    return typeLabel;
  }

  if (callStatus === 'CANCELLED') {
    return t(
      isVideo
        ? 'messenger.calls.chatCancelledVideo'
        : 'messenger.calls.chatCancelledAudio',
    );
  }

  return t(
    isVideo
      ? 'messenger.calls.chatMissedVideo'
      : 'messenger.calls.chatMissedAudio',
  );
}

export function getCallEventIcon(message) {
  const { mediaType } = getCallEventMeta(message);
  return mediaType === 'VIDEO' ? '🎥' : '📞';
}

/** Finished call rows in chat history. Live RINGING/ACTIVE never become CALL_EVENT. */
const REDIALABLE_STATUSES = new Set([
  'MISSED',
  'ENDED',
  'REJECTED',
  'CANCELLED',
  'BUSY',
  'FAILED',
]);

const LIVE_CALL_STATUSES = new Set(['RINGING', 'ACTIVE']);

export function canRedialCallEvent(message) {
  const { callStatus } = getCallEventMeta(message);
  if (!callStatus || LIVE_CALL_STATUSES.has(callStatus)) return false;
  return REDIALABLE_STATUSES.has(callStatus);
}

/** AUDIO | VIDEO from metadata enum — never from UI copy. */
export function getCallRedialMediaType(message) {
  return getCallEventMeta(message).mediaType === 'VIDEO' ? 'VIDEO' : 'AUDIO';
}

/**
 * Other participant relative to the viewer. Does not return the old callId.
 * Falls back to conversationPeerId when calleeId is missing on older rows.
 */
export function getCallRedialPeerId(message, viewerId, conversationPeerId) {
  const { callerId, calleeId } = getCallEventMeta(message);
  const me = viewerId != null ? String(viewerId) : '';
  if (me && callerId && String(callerId) === me) {
    return calleeId || conversationPeerId || null;
  }
  if (me && calleeId && String(calleeId) === me) {
    return callerId || conversationPeerId || null;
  }
  if (me && callerId && String(callerId) !== me) {
    return callerId;
  }
  return conversationPeerId || null;
}
