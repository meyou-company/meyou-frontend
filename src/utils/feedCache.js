export const FIRST_PAGE_FEED_CACHE_KEY = 'first-page-feed-cache';
export const PROFILE_FEED_CACHE_PREFIX = 'profile-feed-cache:';

export function hasValidPostAuthor(post) {
  if (!post || post.id == null || String(post.id).trim() === '') return false;

  const authorId =
    post.authorId ??
    post.author?.id ??
    post.userId ??
    post.author_id;

  if (authorId == null || String(authorId).trim() === '') return false;

  // API may return null author when the user was deleted.
  if (post.author === null) return false;

  return true;
}

export function filterValidFeedPosts(posts) {
  return (Array.isArray(posts) ? posts : []).filter(hasValidPostAuthor);
}

export function parseFirstPageFeedCacheRaw(raw) {
  if (!raw) return { viewerId: null, posts: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { viewerId: null, posts: parsed };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.posts)) {
      return { viewerId: parsed.viewerId ?? null, posts: parsed.posts };
    }
  } catch {
    // ignore parse errors
  }
  return { viewerId: null, posts: [] };
}

/**
 * Short-lived preview for /first-page while GET /posts is in flight.
 * Scoped to viewerId — never returns another user's cached feed.
 */
export function readFirstPageFeedCache(viewerId) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FIRST_PAGE_FEED_CACHE_KEY);
    const { viewerId: cachedViewerId, posts } = parseFirstPageFeedCacheRaw(raw);
    if (viewerId) {
      if (!cachedViewerId || String(cachedViewerId) !== String(viewerId)) {
        return [];
      }
    }
    return filterValidFeedPosts(posts);
  } catch {
    return [];
  }
}

export function writeFirstPageFeedCache(posts, viewerId) {
  if (typeof window === 'undefined') return;
  try {
    const valid = filterValidFeedPosts(posts);
    if (!valid.length) {
      window.localStorage.removeItem(FIRST_PAGE_FEED_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(
      FIRST_PAGE_FEED_CACHE_KEY,
      JSON.stringify({ viewerId: viewerId ?? null, posts: valid }),
    );
  } catch {
    // ignore storage errors
  }
}

export function clearFirstPageFeedCache() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(FIRST_PAGE_FEED_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function clearProfileFeedCaches() {
  if (typeof window === 'undefined') return;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PROFILE_FEED_CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export function listFeedCacheKeys() {
  if (typeof window === 'undefined') return [];
  const keys = [FIRST_PAGE_FEED_CACHE_KEY];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(PROFILE_FEED_CACHE_PREFIX)) keys.push(key);
  }
  return keys;
}

export function clearAllPostFeedCaches() {
  clearFirstPageFeedCache();
  clearProfileFeedCaches();
}
