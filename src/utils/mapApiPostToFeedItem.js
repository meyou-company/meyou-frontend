/**
 * Maps GET/POST posts API item (backend mapPostResponse) → feed card model.
 * Used by:
 * - Global feed (GET /posts) — first-page
 * - Profile feed (GET /posts/users/:authorId/posts) — profile page
 *
 * currentUserId is not used here — visibility / viewerState / permissions come from the API.
 * Profile filtering is done by endpoint (list vs listByAuthor), not in this mapper.
 *
 * Коментарі читаються з post.comments (або commentList / replies). Якщо LIST-ендпоінти
 * не повертають вбудовані comments, масив у стейті буде [] до POST або поки бекенд
 * не додасть comments у відповідь GET.
 */

function mapCommentAuthor(a) {
  if (!a || typeof a !== 'object') return null;
  return {
    id: a.id ?? a._id,
    firstName: a.firstName ?? '',
    lastName: a.lastName ?? '',
    username: a.username ?? a.nick ?? '',
    avatarUrl: a.avatarUrl ?? a.avatar ?? null,
  };
}

function resolveCommentId(c) {
  return (
    c?.commentId ??
    c?.id ??
    c?._id ??
    c?.uuid ??
    c?.comment?.commentId ??
    c?.comment?.id ??
    c?.comment?._id ??
    null
  );
}

function resolveRepliesCount(c) {
  const n =
    c?.repliesCount ??
    c?.replies_count ??
    c?.replyCount ??
    c?.reply_count ??
    null;
  if (n != null && Number.isFinite(Number(n))) return Math.max(0, Number(n));
  if (Array.isArray(c?.replies)) return c.replies.length;
  return 0;
}

function resolveParentId(c) {
  return (
    c?.parentId ??
    c?.parentCommentId ??
    c?.parent_comment_id ??
    c?.replyToId ??
    c?.replyToCommentId ??
    c?.parent?.id ??
    null
  );
}

/** Нормалізує один коментар або відповідь. */
export function normalizeComment(c, { isReply = false } = {}) {
  if (!c || typeof c !== 'object') return null;
  const resolvedId = resolveCommentId(c);
  const content = String(c.content ?? c.text ?? c.body ?? c.message ?? '').trim();
  if (!content) return null;
  const authorRaw = c.author ?? c.user;
  const parentId = resolveParentId(c);
  const replyFlag = isReply || Boolean(parentId);

  const embeddedReplies = Array.isArray(c.replies)
    ? c.replies
        .map((r) => normalizeComment(r, { isReply: true }))
        .filter(Boolean)
    : [];

  return {
    id: resolvedId,
    content,
    createdAt: c.createdAt ?? c.created_at ?? null,
    author: mapCommentAuthor(authorRaw),
    parentId: replyFlag ? parentId : null,
    isReply: replyFlag,
    repliesCount: replyFlag ? 0 : resolveRepliesCount(c),
    replies: embeddedReplies,
    repliesLoaded: embeddedReplies.length > 0,
    repliesExpanded: false,
  };
}

/** Кореневі коментарі + вкладені відповіді (макс. глибина 1). */
export function organizeComments(flat) {
  if (!Array.isArray(flat)) return [];
  const normalized = flat.map((c) => normalizeComment(c)).filter(Boolean);
  const roots = [];
  const repliesByParent = new Map();

  for (const item of normalized) {
    if (item.isReply && item.parentId) {
      const key = String(item.parentId);
      if (!repliesByParent.has(key)) repliesByParent.set(key, []);
      repliesByParent.get(key).push(item);
      continue;
    }
    if (!item.isReply) roots.push({ ...item });
  }

  return roots.map((root) => {
    const extra = repliesByParent.get(String(root.id)) ?? [];
    const mergedReplies = [
      ...(Array.isArray(root.replies) ? root.replies : []),
      ...extra,
    ];
    const byId = new Map();
    mergedReplies.forEach((r) => {
      if (r?.id) byId.set(String(r.id), r);
    });
    const replies = [...byId.values()];
    const repliesCount = Math.max(root.repliesCount ?? 0, replies.length);
    return {
      ...root,
      replies,
      repliesCount,
      repliesLoaded: replies.length > 0 ? true : root.repliesLoaded,
    };
  });
}

export function countPostReplies(comments) {
  if (!Array.isArray(comments)) return 0;
  return comments.reduce((sum, c) => {
    if (c?.isReply) return sum;
    return sum + (c?.repliesCount ?? c?.replies?.length ?? 0);
  }, 0);
}

export function mapApiPostToFeedItem(p) {
  if (!p) return null;
  const media = (() => {
    const raw = Array.isArray(p.media) ? p.media : [];
    const normalized = raw
      .map((m, idx) => {
        const url = m?.url || m?.mediaUrl || m?.imageUrl || '';
        const typeRaw = String(m?.type || '').toUpperCase();
        const type = typeRaw === 'VIDEO' ? 'VIDEO' : 'IMAGE';
        const order = Number.isFinite(m?.order) ? Number(m.order) : idx;
        return url ? { url, type, order } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);

    // Backward compatibility for old posts with single imageUrl.
    if (normalized.length === 0 && p.imageUrl) {
      return [{ url: p.imageUrl, type: 'IMAGE', order: 0 }];
    }
    return normalized;
  })();
  const a = p.author;
  const organizedComments = (() => {
    const raw = p.comments ?? p.commentList;
    return Array.isArray(raw) ? organizeComments(raw) : [];
  })();

  return {
    id: p.id,
    text: p.fullText ?? p.shortText ?? '',
    location: p.location || '',
    media,
    createdAt: p.createdAt ?? null,
    author: a
      ? {
          id: a.id,
          firstName: a.firstName ?? '',
          lastName: a.lastName ?? '',
          username: a.username ?? a.nick ?? a.nickname ?? a.login ?? '',
          avatarUrl: a.avatarUrl ?? a.avatar ?? null,
        }
      : null,
    viewerState: {
      isLiked: p.viewerState?.isLiked === true || p.isLikedByMe === true,
      isSaved: p.viewerState?.isSaved === true || p.isSavedByMe === true,
      isReposted: p.viewerState?.isReposted === true || p.isRepostedByMe === true,
    },
    permissions: {
      canEdit: p.permissions?.canEdit === true,
      canDelete: p.permissions?.canDelete === true,
      isOwner: p.permissions?.isOwner === true,
    },
    comments: organizedComments,
    counts: {
      likes: p.counts?.likes ?? p.likesCount ?? 0,
      comments: p.counts?.comments ?? p.commentsCount ?? 0,
      reposts: p.counts?.reposts ?? p.repostsCount ?? 0,
      saves: p.counts?.saves ?? p.savedCount ?? p.savesCount ?? 0,
      replies:
        p.counts?.replies ??
        p.repliesCount ??
        countPostReplies(organizedComments),
    },
  };
}
