const EMOJI_RUN =
  /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

const HAS_LETTER_OR_DIGIT = /[A-Za-z0-9\u0400-\u04FF]/;

export function isEmojiOnlyMessage(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  const compact = trimmed.replace(/\s/g, '');
  if (!compact || HAS_LETTER_OR_DIGIT.test(compact)) return false;

  return /\p{Extended_Pictographic}/u.test(compact);
}

export function splitMessageTextWithEmoji(text) {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMOJI_RUN)) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'emoji', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}
