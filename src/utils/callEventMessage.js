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
  };
}

export function formatCallEventLabel(message, t) {
  const { callStatus, mediaType, durationSec } = getCallEventMeta(message);
  const isVideo = mediaType === 'VIDEO';

  if (callStatus === 'ENDED') {
    if (durationSec != null) {
      return t('messenger.calls.chatEndedDuration', {
        type: isVideo
          ? t('messenger.calls.videoCall')
          : t('messenger.calls.audioCall'),
        duration: formatCallDuration(durationSec),
      });
    }
    return t(
      isVideo
        ? 'messenger.calls.chatEndedVideo'
        : 'messenger.calls.chatEndedAudio',
    );
  }

  if (callStatus === 'CANCELLED') {
    return t(
      isVideo
        ? 'messenger.calls.chatCancelledVideo'
        : 'messenger.calls.chatCancelledAudio',
    );
  }

  // MISSED / REJECTED / fallback → Instagram-style missed
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
