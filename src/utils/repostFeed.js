import { mapApiPostToFeedItem } from "./mapApiPostToFeedItem";

function unwrapPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  return raw.post ?? raw.data ?? raw;
}

export function sortPostsByNewest(posts) {
  if (!Array.isArray(posts)) return [];
  return [...posts].sort(
    (a, b) =>
      new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
  );
}

/** Витягує новий пост-репост з відповіді POST /posts/:id/repost. */
export function extractCreatedRepostFromResponse(raw, sourcePost) {
  if (!raw || typeof raw !== "object") return null;
  const sourceId = sourcePost?.id != null ? String(sourcePost.id) : null;

  const candidates = [
    raw.repost,
    raw.post,
    raw.data?.repost,
    raw.data?.post,
    raw.data,
    raw,
  ].filter((c) => c && typeof c === "object");

  for (const candidate of candidates) {
    const id = candidate.id ?? candidate._id;
    if (id == null) continue;
    const idStr = String(id);
    if (sourceId && idStr === sourceId) continue;

    const hasOriginalRef =
      candidate.originalPostId != null ||
      candidate.original_post_id != null ||
      candidate.originalPost != null ||
      candidate.original != null ||
      candidate.repostedPost != null;

    if (!hasOriginalRef && !sourceId) continue;

    let mapped = mapApiPostToFeedItem(candidate);
    if (!mapped) continue;

    if (!mapped.originalPost && sourcePost) {
      mapped = {
        ...mapped,
        originalPostId: mapped.originalPostId ?? sourceId,
        originalPost: mapApiPostToFeedItem(sourcePost),
        isRepost: true,
      };
    }

    if (mapped.isRepost || mapped.originalPostId || mapped.originalPost) {
      return mapped;
    }

    if (sourceId && idStr !== sourceId) {
      return {
        ...mapped,
        isRepost: true,
        originalPostId: sourceId,
        originalPost: mapApiPostToFeedItem(sourcePost),
      };
    }
  }

  return null;
}

function mergePartialCountsViewer(prev, raw) {
  const payload = unwrapPayload(raw);
  if (!payload || typeof payload !== "object") return null;
  if (!payload.counts && !payload.viewerState) return null;
  return {
    ...prev,
    counts: payload.counts ? { ...prev.counts, ...payload.counts } : prev.counts,
    viewerState: payload.viewerState
      ? { ...prev.viewerState, ...payload.viewerState }
      : prev.viewerState,
  };
}

function toggleRepostFallback(prev) {
  const reposted = !prev.viewerState?.isReposted;
  const delta = reposted ? 1 : -1;
  return {
    ...prev,
    viewerState: { ...prev.viewerState, isReposted: reposted },
    counts: {
      ...prev.counts,
      reposts: Math.max(0, (prev.counts?.reposts ?? 0) + delta),
    },
  };
}

/** Оновлює лише прапорець isReposted на вихідному пості (не підміняє картку новим id). */
export function markSourcePostReposted(prev, raw) {
  const payload = unwrapPayload(raw);
  const partial = mergePartialCountsViewer(prev, raw);
  if (partial) {
    return {
      ...partial,
      viewerState: { ...partial.viewerState, isReposted: true },
    };
  }

  if (payload && typeof payload === "object") {
    const viewerState = payload.viewerState ?? {};
    const isReposted =
      viewerState.isReposted === true ||
      payload.isRepostedByMe === true ||
      payload.isReposted === true;

    if (isReposted || payload.counts) {
      return {
        ...prev,
        viewerState: {
          ...prev.viewerState,
          ...viewerState,
          isReposted: true,
        },
        counts: payload.counts
          ? { ...prev.counts, ...payload.counts }
          : prev.counts,
      };
    }
  }

  if (!prev.viewerState?.isReposted) {
    return toggleRepostFallback(prev);
  }
  return { ...prev, viewerState: { ...prev.viewerState, isReposted: true } };
}

export function shouldPrependRepostToFeed(created, { currentUserId, feedOwnerId } = {}) {
  if (!created?.id || !created?.author?.id) return false;
  const authorId = String(created.author.id);
  if (feedOwnerId) {
    return authorId === String(feedOwnerId);
  }
  if (currentUserId) {
    return authorId === String(currentUserId);
  }
  return true;
}

/**
 * Після репосту: позначити джерело + додати новий репост у стрічку (якщо це моя / цільова стрічка).
 */
export function mergeRepostIntoFeedList(
  prev,
  sourcePost,
  raw,
  { currentUserId, feedOwnerId } = {}
) {
  const list = Array.isArray(prev) ? prev : [];
  const sourceId = sourcePost?.id != null ? String(sourcePost.id) : null;

  let next = list.map((p) => {
    if (sourceId && String(p.id) === sourceId) {
      return markSourcePostReposted(p, raw);
    }
    return p;
  });

  const created = extractCreatedRepostFromResponse(raw, sourcePost);
  if (created && shouldPrependRepostToFeed(created, { currentUserId, feedOwnerId })) {
    const createdId = String(created.id);
    next = next.filter((p) => String(p.id) !== createdId);
    next = [created, ...next];
  }

  return sortPostsByNewest(next);
}
