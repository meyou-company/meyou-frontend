import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { postsApi } from "../services/postsApi";
import {
  mergeCommentResponse,
  mergeLikeResponse,
  mergeRepostResponse,
} from "../utils/mergePostActionResponse";

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
      setFeedPosts((prev) =>
        prev.map((p) => (String(p.id) === String(postId) ? updater(p) : p))
      );
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

  const onLike = useCallback(
    (post) => {
      run(`like-${post.id}`, async () => {
        try {
          const data = await postsApi.like(post.id);
          patchPost(post.id, (p) => mergeLikeResponse(p, data));
        } catch (e) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Не вдалося поставити лайк";
          toast.error(msg);
        }
      });
    },
    [patchPost, run]
  );

  const onRepost = useCallback(
    (post) => {
      run(`repost-${post.id}`, async () => {
        try {
          const data = await postsApi.repost(post.id);
          patchPost(post.id, (p) => mergeRepostResponse(p, data));
        } catch (e) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Не вдалося зробити репост";
          toast.error(msg);
        }
      });
    },
    [patchPost, run]
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

  const submitComment = useCallback(
    (post, text) => {
      const t = (text || "").trim();
      if (!t) return;
      run(`comment-${post.id}`, async () => {
        try {
          const data = await postsApi.addComment(post.id, t);
          patchPost(post.id, (p) => mergeCommentResponse(p, data, t));
          setCommentDraft("");
        } catch (e) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Не вдалося надіслати коментар";
          toast.error(msg);
        }
      });
    },
    [patchPost, run]
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
          setCommentsOpenPostId((openId) => {
            if (openId != null && String(openId) === String(post.id)) {
              setCommentDraft("");
              return null;
            }
            return openId;
          });
        } catch (e) {
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Не вдалося видалити пост";
          toast.error(msg);
        }
      });
    },
    [run, setFeedPosts]
  );

  return {
    commentsOpenPostId,
    isCommentsOpen,
    commentDraft,
    setCommentDraft,
    toggleCommentsOpen,
    submitComment,
    onLike,
    onRepost,
    onDeletePost,
  };
}
