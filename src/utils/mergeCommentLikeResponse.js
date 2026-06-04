/** Оптимістичний toggle лайка коментаря (isLiked + likesCount). */
export function applyCommentLikeToggle(comment) {
  if (!comment) return comment;
  const nextIsLiked = comment.isLiked !== true;
  const prevCount = Number(comment.likesCount) || 0;
  const nextLikesCount = nextIsLiked
    ? prevCount + 1
    : Math.max(prevCount - 1, 0);

  return {
    ...comment,
    isLiked: nextIsLiked,
    likesCount: nextLikesCount,
    viewerState: {
      ...comment.viewerState,
      isLiked: nextIsLiked,
    },
  };
}

/** Злиття відповіді POST /comments/:id/like у модель коментаря. */
export function mergeCommentLikeResponse(comment, payload) {
  if (!comment) return comment;
  if (!payload || typeof payload !== "object") {
    return applyCommentLikeToggle(comment);
  }

  const isLikedRaw =
    payload.viewerState?.isLiked ??
    payload.isLikedByMe ??
    payload.isLiked ??
    payload.liked;
  const likesCountRaw =
    payload.likesCount ??
    payload.likes_count ??
    payload.counts?.likes ??
    payload.likeCount;

  const nextIsLiked =
    isLikedRaw === true
      ? true
      : isLikedRaw === false
        ? false
        : comment.isLiked === true;

  let nextLikesCount =
    likesCountRaw != null ? Math.max(0, Number(likesCountRaw) || 0) : null;

  if (nextLikesCount == null) {
    const prevCount = Number(comment.likesCount) || 0;
    if (nextIsLiked && comment.isLiked !== true) {
      nextLikesCount = prevCount + 1;
    } else if (!nextIsLiked && comment.isLiked === true) {
      nextLikesCount = Math.max(prevCount - 1, 0);
    } else {
      nextLikesCount = prevCount;
    }
  }

  return {
    ...comment,
    isLiked: nextIsLiked,
    likesCount: nextLikesCount,
    viewerState: {
      ...comment.viewerState,
      isLiked: nextIsLiked,
    },
  };
}
