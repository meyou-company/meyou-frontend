const DAY_MS = 24 * 60 * 60 * 1000;

function pickFirstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function pickFirstValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function getTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function hasStoryReference(message) {
  return Boolean(
    message?.storyId ||
    message?.story_id ||
    message?.metadata?.storyId ||
    message?.metadata?.story_id ||
    message?.metadata?.storyPreview ||
    message?.storyPreview,
  );
}

export function getStoryReplyPreview(message) {
  if (!hasStoryReference(message)) return null;

  const metadata = message?.metadata || {};
  const preview = metadata.storyPreview || message?.storyPreview || {};
  const storyId = pickFirstValue(
    message?.storyId,
    message?.story_id,
    metadata.storyId,
    metadata.story_id,
    preview.id,
    preview.storyId,
  );

  const mediaUrl = pickFirstString(
    preview.thumbnailUrl,
    preview.thumbnail_url,
    preview.previewUrl,
    preview.preview_url,
    preview.mediaUrl,
    preview.media_url,
    preview.url,
    message?.storyMediaUrl,
    message?.mediaUrl,
    message?.media_url,
  );
  const mediaType = pickFirstString(
    preview.mediaType,
    preview.media_type,
    preview.type,
    message?.storyMediaType,
    message?.mediaType,
    message?.media_type,
  ).toLowerCase();
  const text = pickFirstString(preview.text, preview.caption, metadata.storyText);

  const expiresAt = getTime(
    pickFirstValue(preview.expiresAt, preview.expires_at, preview.expiredAt, preview.activeUntil),
  );
  const createdAt = getTime(pickFirstValue(preview.createdAt, preview.created_at));
  const expiredByCreatedAt = !expiresAt && createdAt ? Date.now() - createdAt >= DAY_MS : false;

  const isUnavailable =
    preview.available === false ||
    preview.isAvailable === false ||
    preview.unavailable === true ||
    preview.deleted === true ||
    preview.deletedAt ||
    preview.expired === true ||
    (expiresAt ? expiresAt <= Date.now() : false) ||
    expiredByCreatedAt ||
    (!mediaUrl && !text);

  return {
    storyId,
    mediaUrl: isUnavailable ? '' : mediaUrl,
    mediaType,
    text,
    isUnavailable,
  };
}
