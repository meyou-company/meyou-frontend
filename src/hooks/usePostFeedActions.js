import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { postsApi } from "../services/postsApi";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import {
  mergeCommentResponse,
  mergeLikeResponse,
  mergeRepostResponse,
} from "../utils/mergePostActionResponse";
import { normalizeComment } from "../utils/mapApiPostToFeedItem";
import { clearPostLikeOverride, persistPostLike } from "../utils/postLikePersistence";

function removeDeletedPostFromCaches(postId) {
  if (typeof window === "undefined" || !postId) return;
  const targetId = String(postId);
  try {
    const keys = ["first-page-feed-cache"];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("profile-feed-cache:")) keys.push(key);
    }
    keys.forEach((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.filter((p) => String(p?.id) !== targetId);
      window.localStorage.setItem(key, JSON.stringify(next));
    });
  } catch {
    // ignore cache sync errors
  }
}

function listFeedCacheKeys() {
  if (typeof window === "undefined") return [];
  const keys = ["first-page-feed-cache"];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("profile-feed-cache:")) keys.push(key);
  }
  return keys;
}

function syncPostInCaches(postId, updater) {
  if (typeof window === "undefined" || !postId || typeof updater !== "function") return;
  const targetId = String(postId);
  try {
    listFeedCacheKeys().forEach((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.map((p) =>
        String(p?.id) === targetId ? updater(p) : p
      );
      window.localStorage.setItem(key, JSON.stringify(next));
    });
  } catch {
    // ignore cache sync errors
  }
}

function isPostNotFoundError(error) {
  const status = error?.response?.status;
  const msg = String(getApiErrorMessage(error) || "").toLowerCase();
  return status === 404 || msg.includes("post not found");
}

/**
 * Спільна логіка like / comment / repost / delete для глобальної стрічки та профілю.
 * Оновлює пост локально після відповіді API (без повторного GET).
 */
export function usePostFeedActions(setFeedPosts) {
  /** Який пост має відкриту секцію коментарів (toggle по іконці comments). */
  const [commentsOpenPostId, setCommentsOpenPostId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const inflight = useRef({});

  const patchPost = useCallback(
    (postId, updater) => {
      if (!postId || typeof updater !== "function") return;
      const targetId = String(postId);
      setFeedPosts((prev) =>
        prev.map((p) => (String(p.id) === targetId ? updater(p) : p))
      );
      syncPostInCaches(postId, updater);
    },
    [setFeedPosts]
  );

  const run = useCallback(async (key, fn) => {
    if (inflight.current[key]) return;
    inflight.current[key] = true;
    try {
      await fn();
    } finally {
      delete inflight.current[key];
    }
  }, []);

  const dropPostEverywhere = useCallback(
    (postId) => {
      if (!postId) return;
      setFeedPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
      removeDeletedPostFromCaches(postId);
      setCommentsOpenPostId((openId) => {
        if (openId != null && String(openId) === String(postId)) {
          setCommentDraft("");
          return null;
        }
        return openId;
      });
    },
    [setFeedPosts]
  );

  const onLike = useCallback(
    (post) => {
      run(`like-${post.id}`, async () => {
        try {
          const data = await postsApi.like(post.id);
          patchPost(post.id, (p) => {
            const next = mergeLikeResponse(p, data);
            persistPostLike(post.id, next?.viewerState?.isLiked === true);
            return next;
          });
        } catch (e) {
          if (isPostNotFoundError(e)) {
            dropPostEverywhere(post.id);
            return;
          }
          const msg = getApiErrorMessage(e) || "Не вдалося поставити лайк";
          toast.error(msg);
        }
      });
    },
    [patchPost, run, dropPostEverywhere]
  );

  const onRepost = useCallback(
    (post) => {
      run(`repost-${post.id}`, async () => {
        try {
          const data = await postsApi.repost(post.id);
          patchPost(post.id, (p) => mergeRepostResponse(p, data));
        } catch (e) {
          if (isPostNotFoundError(e)) {
            dropPostEverywhere(post.id);
            return;
          }
          const msg = getApiErrorMessage(e) || "Не вдалося зробити репост";
          toast.error(msg);
        }
      });
    },
    [patchPost, run, dropPostEverywhere]
  );

  const toggleCommentsOpen = useCallback((postId) => {
    setCommentsOpenPostId((id) => {
      if (id != null && String(id) === String(postId)) {
        setCommentDraft("");
        return null;
      }
      setCommentDraft("");
      return postId;
    });
  }, []);

  const isCommentsOpen = useCallback(
    (postId) =>
      commentsOpenPostId != null &&
      String(commentsOpenPostId) === String(postId),
    [commentsOpenPostId]
  );

  const loadComments = useCallback(
    (postId) => {
      if (!postId) return;
      run(`comments-load-${postId}`, async () => {
        try {
          const list = await postsApi.listComments(postId, { page: 1, limit: 50 });
          const normalized = (Array.isArray(list) ? list : [])
            .map(normalizeComment)
            .filter(Boolean);
          patchPost(postId, (p) => ({
            ...p,
            comments: normalized,
            counts: {
              ...p.counts,
              comments: Math.max(p.counts?.comments ?? 0, normalized.length),
            },
          }));
        } catch (e) {
          const msg = getApiErrorMessage(e);
          if (msg) toast.error(msg);
        }
      });
    },
    [patchPost, run]
  );

  const submitComment = useCallback(
    (post, text) => {
      const t = (text || "").trim();
      if (!t) return;
      run(`comment-${post.id}`, async () => {
        try {
          const data = await postsApi.addComment(post.id, t);
          patchPost(post.id, (p) => mergeCommentResponse(p, data, t));
          loadComments(post.id);
          setCommentDraft("");
        } catch (e) {
          if (isPostNotFoundError(e)) {
            dropPostEverywhere(post.id);
            return;
          }
          const msg = getApiErrorMessage(e) || "Не вдалося надіслати коментар";
          toast.error(msg);
        }
      });
    },
    [patchPost, run, loadComments, dropPostEverywhere]
  );

  const onDeleteComment = useCallback(
    (post, commentId) => {
      if (!post?.id || !commentId) return;
      run(`comment-delete-${post.id}-${commentId}`, async () => {
        try {
          await postsApi.deleteComment(commentId);
          patchPost(post.id, (p) => {
            const prevComments = Array.isArray(p.comments) ? p.comments : [];
            const nextComments = prevComments.filter(
              (c) => String(c?.id) !== String(commentId)
            );
            return {
              ...p,
              comments: nextComments,
              counts: {
                ...p.counts,
                comments: Math.max(0, (p.counts?.comments ?? prevComments.length) - 1),
              },
            };
          });
          loadComments(post.id);
        } catch (e) {
          const msg = getApiErrorMessage(e) || "Не вдалося видалити коментар";
          toast.error(msg);
        }
      });
    },
    [run, patchPost, loadComments, dropPostEverywhere]
  );

  const openComments = useCallback(
    (postId) => {
      setCommentsOpenPostId((id) => {
        const willOpen = !(id != null && String(id) === String(postId));
        if (!willOpen) {
          setCommentDraft("");
          return null;
        }
        setCommentDraft("");
        loadComments(postId);
        return postId;
      });
    },
    [loadComments]
  );

  const onDeletePost = useCallback(
    (post) => {
      if (!post?.permissions?.canDelete) return;
      if (typeof window !== "undefined" && !window.confirm("Видалити цей пост?")) {
        return;
      }
      run(`delete-${post.id}`, async () => {
        try {
          await postsApi.deletePost(post.id);
          setFeedPosts((prev) =>
            prev.filter((p) => String(p.id) !== String(post.id))
          );
          clearPostLikeOverride(post.id);
          removeDeletedPostFromCaches(post.id);
          setCommentsOpenPostId((openId) => {
            if (openId != null && String(openId) === String(post.id)) {
              setCommentDraft("");
              return null;
            }
            return openId;
          });
        } catch (e) {
          if (isPostNotFoundError(e)) {
            dropPostEverywhere(post.id);
            return;
          }
          const msg = getApiErrorMessage(e) || "Не вдалося видалити пост";
          toast.error(msg);
        }
      });
    },
    [run, setFeedPosts, dropPostEverywhere]
  );

  return {
    commentsOpenPostId,
    isCommentsOpen,
    commentDraft,
    setCommentDraft,
    toggleCommentsOpen: openComments,
    submitComment,
    onDeleteComment,
    loadComments,
    onLike,
    onRepost,
    onDeletePost,
  };
}
