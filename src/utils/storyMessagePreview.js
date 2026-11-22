export const STORY_MESSAGE_MARKER = '[[MEYOU_STORY:';
const STORY_MESSAGE_MARKER_END = ']]';
const STORY_URL_RE = /(?:^|\s)(?:https?:\/\/[^\s]+)?\/stories\/([^/\s?#]+)/i;

function pickFirstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function pickFirstValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export function encodeStoryMessageMarker(preview) {
  try {
    return `${STORY_MESSAGE_MARKER}${encodeURIComponent(JSON.stringify(preview || {}))}${STORY_MESSAGE_MARKER_END}`;
  } catch {
    return '';
  }
}

/** Safe forward marker — story id + author only (no Cloudinary URLs). */
export function encodeStoryShareMarker({
  storyId,
  mediaType,
  text,
  author,
}) {
  if (!storyId) return '';
  const payload = {
    v: 2,
    storyId,
    mediaType: String(mediaType || 'image').toLowerCase() === 'video' ? 'video' : 'image',
  };
  const caption = String(text || '').trim();
  if (caption) payload.text = caption;
  if (author && typeof author === 'object') {
    payload.author = {
      id: pickFirstValue(author.id, author._id),
      username: pickFirstString(author.username, author.nick, author.nickname),
      firstName: pickFirstString(author.firstName, author.first_name),
      lastName: pickFirstString(author.lastName, author.last_name),
      name: pickFirstString(author.name),
    };
  }
  return encodeStoryMessageMarker(payload);
}

export function getStoryMessageMarker(text = '') {
  if (typeof text !== 'string') return null;
  const start = text.indexOf(STORY_MESSAGE_MARKER);
  if (start < 0) return null;
  const contentStart = start + STORY_MESSAGE_MARKER.length;
  const end = text.indexOf(STORY_MESSAGE_MARKER_END, contentStart);
  if (end < 0) return null;

  try {
    return JSON.parse(decodeURIComponent(text.slice(contentStart, end)));
  } catch {
    return null;
  }
}

export function getStoryMessageText(message) {
  const raw = typeof message?.text === 'string' ? message.text : '';
  if (!raw) return raw;

  const withoutMarker = raw.replace(/\[\[MEYOU_STORY:[^\]]+\]\]\s*/g, '').trim();
  return withoutMarker.replace(STORY_URL_RE, '').trim();
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
    message?.storyPreview ||
    getStoryMessageMarker(message?.text)
  );
}

/**
 * Client-side story card hints only — media must come from stories/chat-previews API.
 */
export function getStoryReplyPreview(message) {
  const metadata = message?.metadata || {};
  const markerPreview = getStoryMessageMarker(message?.text);
  const storyUrlMatch = typeof message?.text === 'string' ? message.text.match(STORY_URL_RE) : null;
  const preview = metadata.storyPreview || message?.storyPreview || markerPreview || {};
  if (!hasStoryReference(message) && !storyUrlMatch?.[1]) return null;

  const storyId = pickFirstValue(
    message?.storyId,
    message?.story_id,
    metadata.storyId,
    metadata.story_id,
    preview.storyId,
    preview.id,
    storyUrlMatch?.[1],
  );

  if (!storyId) return null;

  const mediaType = pickFirstString(
    preview.mediaType,
    preview.media_type,
    preview.type,
    metadata.storyPreview?.mediaType,
  ).toLowerCase();
  const text = pickFirstString(preview.text, preview.caption, metadata.storyText);

  return {
    storyId,
    mediaUrl: '',
    mediaType: mediaType || 'image',
    text,
    author: getAuthor(preview, message),
    kind: markerPreview ? 'forward' : 'reply',
    isUnavailable: false,
    requiresServerPreview: true,
  };
}