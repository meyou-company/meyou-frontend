/** ID автора допису з різних форматів API. */
export function getPostAuthorId(post) {
  if (!post) return "";
  const id =
    post.author?.id ?? post.authorId ?? post.userId ?? post.author_id ?? null;
  return id != null ? String(id) : "";
}

export function isPostOwner(post, currentUserId) {
  const uid =
    currentUserId != null && currentUserId !== ""
      ? String(currentUserId)
      : "";
  const authorId = getPostAuthorId(post);
  return Boolean(uid && authorId && uid === authorId);
}

/** Мій репост у стрічці (картка з originalPost, автор — я). */
export function isMyRepost(post, currentUserId) {
  const hasOriginal = Boolean(post?.originalPostId || post?.originalPost);
  if (!hasOriginal) return false;
  return isPostOwner(post, currentUserId);
}

/** DELETE лише id картки репосту, ніколи originalPostId. */
export function getDeleteTargetPostId(post) {
  if (!post?.id) return "";
  return String(post.id);
}

export function getOriginalPostIdFromRepost(post) {
  if (!post) return null;
  const id = post.originalPostId ?? post.originalPost?.id ?? null;
  return id != null ? String(id) : null;
}

/**
 * Права меню ⋯.
 * Звичайний свій пост: редагування + видалення.
 * Свій репост: лише «Прибрати зі стрічки» (DELETE id репосту).
 */
export function resolvePostMenuPermissions(post, currentUserId) {
  const owner = isPostOwner(post, currentUserId);
  const myRepost = isMyRepost(post, currentUserId);
  const apiCanEdit =
    post?.permissions?.canEdit === true || post?.canEdit === true;
  const apiCanDelete =
    post?.permissions?.canDelete === true || post?.canDelete === true;
  const canShowMenu =
    myRepost || (!myRepost && (owner || apiCanEdit || apiCanDelete));

  return {
    isOwner: owner,
    isMyRepost: myRepost,
    canShowMenu,
    canEdit: !myRepost && (owner || apiCanEdit),
    canDelete: !myRepost && (owner || apiCanDelete),
    canRemoveFromFeed: myRepost,
  };
}
