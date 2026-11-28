import { resolveFeedPostText } from './resolveFeedPostText';
import { hasPostMedia } from './postMedia';

const MAX_CHAIN_DEPTH = 32;

/** API / mapped item is a repost row with no own caption or media (intermediate in a chain). */
export function isRepostEmbedShell(post) {
  if (!post || typeof post !== 'object') return false;
  const originalPostId =
    post.originalPostId ?? post.original_post_id ?? post.repostOfId ?? null;
  if (originalPostId == null || String(originalPostId).trim() === '') {
    return false;
  }
  const text = resolveFeedPostText(post).trim();
  if (text) return false;
  return !hasPostMedia(post);
}

/**
 * Walk nested originalPost / original_post until the root content post.
 * Used when API still returns one hop or for optimistic client merge.
 */
export function unwrapRepostEmbedOriginal(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  let current = raw;
  const seen = new Set();

  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth += 1) {
    const id = current.id ?? current.originalPostId ?? current.original_post_id;
    if (id != null) {
      const key = String(id);
      if (seen.has(key)) break;
      seen.add(key);
    }

    if (!isRepostEmbedShell(current)) break;

    const nested =
      current.originalPost ??
      current.original_post ??
      current.original ??
      current.repostedPost ??
      current.sourcePost ??
      null;
    if (!nested || typeof nested !== 'object') break;
    current = nested;
  }

  return current;
}

/** For feed cards: embed source when user reposts a repost visible in the UI. */
export function repostSourceForEmbed(sourcePost) {
  if (!sourcePost) return null;
  if (isRepostEmbedShell(sourcePost) && sourcePost.originalPost) {
    return unwrapRepostEmbedOriginal(sourcePost.originalPost);
  }
  return unwrapRepostEmbedOriginal(sourcePost);
}