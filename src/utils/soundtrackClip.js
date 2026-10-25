export const DEFAULT_CLIP_SEC = 15;
export const DEFAULT_MUSIC_VOLUME = 0.8;
export const DEFAULT_ORIGINAL_VOLUME = 0.4;

export function normalizeTrackLengthSec(length) {
  const value = Number(length);
  if (!Number.isFinite(value) || value <= 0) return 30;
  return value > 10_000 ? Math.round(value / 1000) : Math.round(value);
}

export function defaultClip(lengthSec) {
  const duration = Math.max(1, Number(lengthSec) || 30);
  return {
    startSec: 0,
    endSec: Math.min(DEFAULT_CLIP_SEC, duration),
  };
}

export function clampClip({ startSec, endSec, lengthSec }) {
  const duration = Math.max(1, Number(lengthSec) || 30);
  let start = Number(startSec);
  let end = Number(endSec);
  if (!Number.isFinite(start) || start < 0) start = 0;
  if (!Number.isFinite(end) || end > duration) end = duration;
  if (end - start < 1) {
    end = Math.min(duration, start + 1);
    if (end - start < 1) start = Math.max(0, end - 1);
  }
  return {
    startSec: Math.round(start * 10) / 10,
    endSec: Math.round(end * 10) / 10,
  };
}

export function formatArtists(artists) {
  if (!Array.isArray(artists) || !artists.length) return "";
  return artists.filter(Boolean).join(", ");
}

export function formatClipTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function canPublishWithSoundtrack(soundtrack) {
  return !soundtrack?.id;
}

export function createSoundtrackSelection(track, extras = {}) {
  const lengthSec = normalizeTrackLengthSec(track?.lengthSec ?? track?.length);
  const clip = clampClip({
    ...defaultClip(lengthSec),
    ...extras,
    lengthSec,
  });

  return {
    id: track.id,
    title: track.title,
    artists: Array.isArray(track.artists) ? track.artists : [],
    imageUrl: track.imageUrl || null,
    lengthSec,
    startSec: clip.startSec,
    endSec: clip.endSec,
    musicVolume:
      extras.musicVolume == null ? DEFAULT_MUSIC_VOLUME : Number(extras.musicVolume),
    originalVolume:
      extras.originalVolume == null
        ? DEFAULT_ORIGINAL_VOLUME
        : Number(extras.originalVolume),
  };
}
