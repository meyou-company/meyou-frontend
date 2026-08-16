const STORAGE_PREFIX = 'meyou_message_drafts:';
const MAX_DRAFT_CHARS = 5000;

export function messageDraftsStorageKey(userId) {
  if (userId === undefined || userId === null || userId === '') return null;
  return `${STORAGE_PREFIX}${userId}`;
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function sanitizeDraftText(value) {
  if (typeof value !== 'string') return '';
  return value.length > MAX_DRAFT_CHARS ? value.slice(0, MAX_DRAFT_CHARS) : value;
}

export function isNonEmptyDraft(value) {
  return Boolean(sanitizeDraftText(value).trim());
}

export function getConversationDraft(drafts, conversationId) {
  if (!conversationId || !drafts || typeof drafts !== 'object') return '';
  return sanitizeDraftText(drafts[String(conversationId)]);
}

export function upsertMessageDraft(drafts, conversationId, text) {
  const id = conversationId == null ? '' : String(conversationId);
  if (!id) return drafts && typeof drafts === 'object' ? drafts : {};

  const current = drafts && typeof drafts === 'object' ? drafts : {};
  const nextText = sanitizeDraftText(text);

  if (!nextText.trim()) {
    if (!Object.prototype.hasOwnProperty.call(current, id)) return current;
    const next = { ...current };
    delete next[id];
    return next;
  }

  if (current[id] === nextText) return current;
  return { ...current, [id]: nextText };
}

function sanitizeDraftMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!id || !isNonEmptyDraft(value)) continue;
    next[id] = sanitizeDraftText(value);
  }
  return next;
}

export function readMessageDrafts(userId, storage = getStorage()) {
  const key = messageDraftsStorageKey(userId);
  if (!key || !storage?.getItem) return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    return sanitizeDraftMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writeMessageDrafts(userId, drafts, storage = getStorage()) {
  const key = messageDraftsStorageKey(userId);
  if (!key || !storage) return;
  const next = sanitizeDraftMap(drafts);
  try {
    if (Object.keys(next).length === 0) {
      storage.removeItem?.(key);
      return;
    }
    storage.setItem?.(key, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
}

export function persistConversationDraft(userId, drafts, conversationId, text, storage = getStorage()) {
  const next = upsertMessageDraft(drafts, conversationId, text);
  writeMessageDrafts(userId, next, storage);
  return next;
}

export function formatDraftListPreview(draftText, t) {
  const text = sanitizeDraftText(draftText).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return t('messenger.draftPreview', { text });
}
