import { mapApiPostToFeedItem, normalizeComment } from "./mapApiPostToFeedItem";

function unwrapPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  return raw.post ?? raw.data ?? raw;
}

function mergeMappedFullPost(prev, raw) {
  const payload = unwrapPayload(raw);
  if (!payload || typeof payload !== "object") return null;
  if (!payload.id) return null;
  // Guard: do not treat plain comment payload as a full post.
  const looksLikePost =
    payload.fullText != null ||
    payload.shortText != null ||
    payload.location != null ||
    payload.author != null ||
    payload.viewerState != null ||
    payload.permissions != null ||
    payload.counts != null ||
    Array.isArray(payload.media) ||
    payload.imageUrl != null;
  if (!looksLikePost) return null;
  const mapped = mapApiPostToFeedItem(payload);
  if (!mapped) return null;
  const prevComments = Array.isArray(prev.comments) ? prev.comments : [];
  const mappedComments = Array.isArray(mapped.comments) ? mapped.comments : [];
  return {
    ...mapped,
    comments: mappedComments.length > 0 ? mappedComments : prevComments,
  };
}

/** Відповідь POST /comments може повернути лише об'єкт коментаря без обгортки post. */
function tryExtractCommentPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.comment && typeof raw.comment === "object") return raw.comment;
  const u = unwrapPayload(raw);
  if (u?.comment && typeof u.comment === "object") return u.comment;
  const candidate = u ?? raw;
  if (!candidate || typeof candidate !== "object") return null;
  if (
    candidate.counts != null ||
    candidate.viewerState != null ||
    candidate.fullText != null ||
    candidate.shortText != null
  ) {
    return null;
  }
  if (candidate.id == null) return null;
  if (
    candidate.content == null &&
    candidate.text == null &&
    candidate.body == null &&
    candidate.message == null
  ) {
    return null;
  }
  return candidate;
}

function mergePartialCountsViewer(prev, raw) {
  const payload = unwrapPayload(raw);
  if (!payload || typeof payload !== "object") return null;
  if (!payload.counts && !payload.viewerState) return null;
  return {
    ...prev,
    counts: payload.counts
      ? { ...prev.counts, ...payload.counts }
      : prev.counts,
    viewerState: payload.viewerState
      ? { ...prev.viewerState, ...payload.viewerState }
      : prev.viewerState,
  };
}

function toggleLikeFallback(prev) {
  const liked = !prev.viewerState?.isLiked;
  const delta = liked ? 1 : -1;
  return {
    ...prev,
    viewerState: { ...prev.viewerState, isLiked: liked },
    counts: {
      ...prev.counts,
      likes: Math.max(0, (prev.counts.likes ?? 0) + delta),
    },
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
      reposts: Math.max(0, (prev.counts.reposts ?? 0) + delta),
    },
  };
}

/** POST /posts/:id/like — оновити пост з тіла відповіді (або fallback toggle). */
export function mergeLikeResponse(prev, raw) {
  const full = mergeMappedFullPost(prev, raw);
  if (full) return full;
  const partial = mergePartialCountsViewer(prev, raw);
  if (partial) return partial;
  return toggleLikeFallback(prev);
}

/** POST /posts/:id/repost */
export function mergeRepostResponse(prev, raw) {
  const full = mergeMappedFullPost(prev, raw);
  if (full) return full;
  const partial = mergePartialCountsViewer(prev, raw);
  if (partial) return partial;
  return toggleRepostFallback(prev);
}

/** POST /posts/:id/comments — додати коментар і оновити лічильник. */
export function mergeCommentResponse(prev, raw, submittedContent) {
  const text = (submittedContent || "").trim();

  let base = mergeMappedFullPost(prev, raw);
  if (!base) {
    base = {
      ...prev,
      comments: Array.isArray(prev.comments) ? [...prev.comments] : [],
    };
  }

  const commentPayload = tryExtractCommentPayload(raw);

  let added = false;
  if (commentPayload) {
    const nc = normalizeComment(commentPayload);
    if (nc && nc.content) {
      const dup = base.comments.some((x) => String(x.id) === String(nc.id));
      if (!dup) {
        base.comments = [...base.comments, nc];
        added = true;
      }
    }
  }

  if (!added && text) {
    base.comments = [
      ...base.comments,
      {
        id: `local-${Date.now()}`,
        content: text,
        createdAt: new Date().toISOString(),
        author: null,
      },
    ];
    added = true;
  }

  const payload = unwrapPayload(raw) ?? (raw && typeof raw === "object" ? raw : null);
  if (payload && typeof payload === "object" && payload.counts) {
    base.counts = { ...prev.counts, ...payload.counts };
  } else if (added) {
    const fromApi =
      payload && typeof payload === "object" && payload.counts?.comments != null
        ? payload.counts.comments
        : null;
    base.counts = {
      ...prev.counts,
      comments:
        fromApi != null
          ? fromApi
          : Math.max(prev.counts.comments ?? 0, base.comments.length),
    };
  }

  return base;
}
