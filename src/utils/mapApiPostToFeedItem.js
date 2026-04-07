/**
 * Maps GET/POST posts API item (backend mapPostResponse) → feed card model.
 * Used by:
 * - Global feed (GET /posts) — first-page
 * - Profile feed (GET /users/:authorId/posts) — profile page
 *
 * currentUserId is not used here — visibility / viewerState / permissions come from the API.
 * Profile filtering is done by endpoint (list vs listByAuthor), not in this mapper.
 *
 * Коментарі читаються з post.comments (або commentList / replies). Якщо LIST-ендпоінти
 * не повертають вбудовані comments, масив у стейті буде [] до POST або поки бекенд
 * не додасть comments у відповідь GET.
 */

function mapCommentAuthor(a) {
  if (!a || typeof a !== "object") return null;
  return {
    id: a.id ?? a._id,
    firstName: a.firstName ?? "",
    lastName: a.lastName ?? "",
    username: a.username ?? a.nick ?? "",
    avatarUrl: a.avatarUrl ?? a.avatar ?? null,
  };
}

export function normalizeComment(c) {
  if (!c || typeof c !== "object") return null;
  const content = String(
    c.content ?? c.text ?? c.body ?? c.message ?? ""
  ).trim();
  if (!content) return null;
  const authorRaw = c.author ?? c.user;
  return {
    id: c.id ?? c._id ?? `c-${Math.random().toString(36).slice(2, 11)}`,
    content,
    createdAt: c.createdAt ?? c.created_at ?? null,
    author: mapCommentAuthor(authorRaw),
  };
}

export function mapApiPostToFeedItem(p) {
  if (!p) return null;
  const media = (() => {
    const raw = Array.isArray(p.media) ? p.media : [];
    const normalized = raw
      .map((m, idx) => {
        const url = m?.url || m?.mediaUrl || m?.imageUrl || "";
        const typeRaw = String(m?.type || "").toUpperCase();
        const type = typeRaw === "VIDEO" ? "VIDEO" : "IMAGE";
        const order = Number.isFinite(m?.order) ? Number(m.order) : idx;
        return url ? { url, type, order } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);

    // Backward compatibility for old posts with single imageUrl.
    if (normalized.length === 0 && p.imageUrl) {
      return [{ url: p.imageUrl, type: "IMAGE", order: 0 }];
    }
    return normalized;
  })();
  const a = p.author;
  return {
    id: p.id,
    text: p.fullText ?? p.shortText ?? "",
    location: p.location || "",
    media,
    createdAt: p.createdAt ?? null,
    author: a
      ? {
          id: a.id,
          firstName: a.firstName ?? "",
          lastName: a.lastName ?? "",
          username: a.username ?? "",
          avatarUrl: a.avatarUrl ?? a.avatar ?? null,
        }
      : null,
    counts: {
      likes: p.counts?.likes ?? 0,
      comments: p.counts?.comments ?? 0,
      reposts: p.counts?.reposts ?? 0,
      saves: p.counts?.saves ?? 0,
    },
    viewerState: {
      isLiked: p.viewerState?.isLiked === true,
      isSaved: p.viewerState?.isSaved === true,
      isReposted: p.viewerState?.isReposted === true,
    },
    permissions: {
      canEdit: p.permissions?.canEdit === true,
      canDelete: p.permissions?.canDelete === true,
      isOwner: p.permissions?.isOwner === true,
    },
    comments: (() => {
      const raw = p.comments ?? p.commentList ?? p.replies;
      return Array.isArray(raw)
        ? raw.map(normalizeComment).filter(Boolean)
        : [];
    })(),
  };
}
