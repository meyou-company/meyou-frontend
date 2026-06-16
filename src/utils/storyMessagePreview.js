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

function getAuthor(preview, message) {
  const metadata = message?.metadata || {};
  const rawAuthor = preview?.author || preview?.user || metadata.storyAuthor || message?.storyAuthor || {};
  const username = pickFirstString(
    rawAuthor.username,
    rawAuthor.nick,
    rawAuthor.nickname,
    preview?.authorUsername,
    preview?.username,
    metadata.storyAuthorUsername,
  );
  const firstName = pickFirstString(rawAuthor.firstName, rawAuthor.first_name);
  const lastName = pickFirstString(rawAuthor.lastName, rawAuthor.last_name);
  const name = pickFirstString(rawAuthor.name, [firstName, lastName].filter(Boolean).join(' '));

  return {
    id: pickFirstValue(rawAuthor.id, rawAuthor._id, preview?.authorId, metadata.storyAuthorId),
    username,
    firstName,
    lastName,
    name,
    avatarUrl: pickFirstString(
      rawAuthor.avatarUrl,
      rawAuthor.avatar,
      rawAuthor.photoUrl,
      preview?.authorAvatarUrl,
      metadata.storyAuthorAvatarUrl,
    ),
  };
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
  const createdAt = pickFirstValue(preview.createdAt, preview.created_at, metadata.storyCreatedAt);
  const expiresAtRaw = pickFirstValue(
    preview.expiresAt,
    preview.expires_at,
    preview.expiredAt,
    preview.activeUntil,
    metadata.storyExpiresAt,
  );

  const expiresAt = getTime(expiresAtRaw);
  const createdAtTime = getTime(createdAt);
  const expiredByCreatedAt =
    !expiresAt && createdAtTime ? Date.now() - createdAtTime >= DAY_MS : false;

  const isUnavailable =
    preview.available === false ||
    preview.isAvailable === false ||
    preview.unavailable === true ||
    preview.deleted === true ||
    preview.deletedAt ||
    preview.expired === true ||
    (expiresAt ? expiresAt <= Date.now() : false) ||
    expiredByCreatedAt ||
    !storyId ||
    !mediaUrl;

  return {
    storyId,
    mediaUrl: isUnavailable ? '' : mediaUrl,
    mediaType,
    text,
    createdAt,
    expiresAt: expiresAtRaw,
    author: getAuthor(preview, message),
    isUnavailable,
  };
}
