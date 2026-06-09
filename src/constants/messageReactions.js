export const MESSAGE_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const EMOJI_TO_REACTION_TYPE = {
  '👍': 'LIKE',
  '❤️': 'LOVE',
  '😂': 'HAHA',
  '😮': 'WOW',
  '😢': 'SAD',
  '🔥': 'FIRE',
};

export const REACTION_TYPE_TO_EMOJI = Object.fromEntries(
  Object.entries(EMOJI_TO_REACTION_TYPE).map(([emoji, type]) => [type, emoji]),
);

export function emojiToReactionType(emoji) {
  return EMOJI_TO_REACTION_TYPE[emoji] ?? null;
}

export function reactionTypeToEmoji(type) {
  return REACTION_TYPE_TO_EMOJI[type] ?? null;
}

export function getMyReactionEmoji(reactions, userId) {
  if (!Array.isArray(reactions) || !userId) return null;
  const mine = reactions.find((r) => String(r.userId) === String(userId));
  return mine?.emoji ?? reactionTypeToEmoji(mine?.reactionType);
}
