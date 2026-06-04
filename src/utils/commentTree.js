import { getCommentBackendId } from "./mapApiPostToFeedItem";

/** Знайти коментар або відповідь у дереві за backend id. */
export function findCommentInTree(comments, commentId) {
  if (!commentId) return null;
  const target = String(commentId);
  const list = Array.isArray(comments) ? comments : [];

  for (const c of list) {
    const cid = getCommentBackendId(c) ?? c?.id;
    if (cid != null && String(cid) === target) return c;
    if (!Array.isArray(c?.replies)) continue;
    for (const r of c.replies) {
      const rid = getCommentBackendId(r) ?? r?.id;
      if (rid != null && String(rid) === target) return r;
    }
  }
  return null;
}

/** Оновити коментар або вкладену відповідь за id. */
export function updateCommentInTree(comments, commentId, updater) {
  if (!commentId || typeof updater !== "function") {
    return Array.isArray(comments) ? comments : [];
  }
  const targetId = String(commentId);
  const list = Array.isArray(comments) ? comments : [];

  return list.map((c) => {
    if (String(c?.id) === targetId) {
      return updater(c);
    }
    if (!Array.isArray(c?.replies) || c.replies.length === 0) {
      return c;
    }
    let touched = false;
    const replies = c.replies.map((r) => {
      if (String(r?.id) === targetId) {
        touched = true;
        return updater(r);
      }
      return r;
    });
    return touched ? { ...c, replies } : c;
  });
}
