import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { postsApi } from "../services/postsApi";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import {
  mergeCommentResponse,
  mergeLikeResponse,
} from "../utils/mergePostActionResponse";
import {
  extractCreatedRepostFromResponse,
  mergeRepostIntoFeedList,
} from "../utils/repostFeed";
import {
  normalizeComment,
  organizeComments,
  countPostReplies,
  mapApiPostToFeedItem,
} from "../utils/mapApiPostToFeedItem";
import { clearPostLikeOverride, persistPostLike } from "../utils/postLikePersistence";
import {
  getDeleteTargetPostId,
  getOriginalPostIdFromRepost,
  isMyRepost,
  resolvePostMenuPermissions,
} from "../utils/postMenuPermissions";
import { findCommentInTree, updateCommentInTree } from "../utils/commentTree";
import {
  applyCommentLikeToggle,
  mergeCommentLikeResponse,
} from "../utils/mergeCommentLikeResponse";
import {
  getCommentBackendId,
  stringifyCommentId,
} from "../utils/mapApiPostToFeedItem";

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

function applyFeedAfterRepostRemoved(prev, repostPostId, originalPostId) {
  const deletedId = String(repostPostId);
  return prev
    .filter((p) => String(p.id) !== deletedId)
    .map((p) => {
      if (!originalPostId || String(p.id) !== String(originalPostId)) {
        return p;
      }
      return {
        ...p,
        viewerState: {
          ...p.viewerState,
          isReposted: false,
        },
        counts: {
          ...p.counts,
          reposts: Math.max(0, (p.counts?.reposts ?? 0) - 1),
        },
      };
    });
}

/**
 * Спільна логіка like / comment / repost / delete для глобальної стрічки та профілю.
 * Оновлює пост локально після відповіді API (без повторного GET).
 */
export function usePostFeedActions(
  setFeedPosts,
  { currentUserId, feedOwnerId, refetchFeed } = {}
) {
  /** Який пост має відкриту секцію коментарів (toggle по іконці comments). */
  const [commentsOpenPostId, setCommentsOpenPostId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyOpenCommentId, setReplyOpenCommentId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [sharePost, setSharePost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isSavingEditPost, setIsSavingEditPost] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState(null);
  const replyDraftsRef = useRef({});
  const replyDraftSyncRef = useRef("");
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

  const handleRepostToFeed = useCallback(
    async (post) => {
      if (!post?.id) throw new Error("post required");
      if (post.viewerState?.isReposted) {
        return null;
      }
      try {
        const data = await postsApi.repost(post.id);
        const created = extractCreatedRepostFromResponse(data, post);

        setFeedPosts((prev) =>
          mergeRepostIntoFeedList(prev, post, data, {
            currentUserId,
            feedOwnerId,
          })
        );

        if (!created && typeof refetchFeed === "function") {
          const shouldRefetch =
            !feedOwnerId ||
            (currentUserId &&
              String(feedOwnerId) === String(currentUserId));
          if (shouldRefetch) {
            await refetchFeed();
          }
        }

        return data;
      } catch (e) {
        if (isPostNotFoundError(e)) {
          dropPostEverywhere(post.id);
        }
        const msg = getApiErrorMessage(e) || "Не вдалося зробити репост";
        throw new Error(msg);
      }
    },
    [
      setFeedPosts,
      currentUserId,
      feedOwnerId,
      refetchFeed,
      dropPostEverywhere,
    ]
  );

  const toggleCommentsOpen = useCallback((postId) => {
    setCommentsOpenPostId((id) => {
      if (id != null && String(id) === String(postId)) {
        setCommentDraft("");
        setReplyOpenCommentId(null);
        setReplyDraft("");
        return null;
      }
      setCommentDraft("");
      setReplyOpenCommentId(null);
      setReplyDraft("");
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
          const organized = organizeComments(
            Array.isArray(list) ? list : []
          );
          patchPost(postId, (p) => ({
            ...p,
            comments: organized,
            counts: {
              ...p.counts,
              comments: Math.max(p.counts?.comments ?? 0, organized.length),
              replies: countPostReplies(organized),
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

  const patchCommentOnPost = useCallback(
    (postId, commentId, updater) => {
      patchPost(postId, (p) => {
        const prev = Array.isArray(p.comments) ? p.comments : [];
        const next = prev.map((c) =>
          String(c?.id) === String(commentId) ? updater(c) : c
        );
        return {
          ...p,
          comments: next,
          counts: {
            ...p.counts,
            replies: countPostReplies(next),
          },
        };
      });
    },
    [patchPost]
  );

  const loadReplies = useCallback(
    (postId, commentId, { limit = 50 } = {}) => {
      if (!postId || !commentId) return Promise.resolve();
      return run(`replies-load-${commentId}`, async () => {
        try {
          const list = await postsApi.listReplies(commentId, { page: 1, limit });
          const replies = (Array.isArray(list) ? list : [])
            .map((r) => normalizeComment(r, { isReply: true }))
            .filter(Boolean);
          patchCommentOnPost(postId, commentId, (c) => ({
            ...c,
            replies,
            repliesLoaded: true,
            repliesCount: Math.max(c.repliesCount ?? 0, replies.length),
          }));
        } catch (e) {
          const msg = getApiErrorMessage(e) || "Не вдалося завантажити відповіді";
          toast.error(msg);
        }
      });
    },
    [run, patchCommentOnPost]
  );

  const openReplyComposer = useCallback(
    (post, commentId) => {
      if (!commentId) return;
      setReplyOpenCommentId((prev) => {
        if (prev != null && String(prev) !== String(commentId)) {
          replyDraftsRef.current[String(prev)] = replyDraftSyncRef.current;
        }
        const nextDraft = replyDraftsRef.current[String(commentId)] ?? "";
        replyDraftSyncRef.current = nextDraft;
        setReplyDraft(nextDraft);
        return commentId;
      });
      const comment = (post?.comments ?? []).find(
        (c) => String(c?.id) === String(commentId)
      );
      if (
        comment &&
        (comment.repliesCount ?? 0) > 0 &&
        !comment.repliesLoaded
      ) {
        loadReplies(post.id, commentId, { limit: 50 });
      }
    },
    [loadReplies]
  );

  const setReplyDraftForOpen = useCallback((text) => {
    replyDraftSyncRef.current = text;
    setReplyDraft(text);
    setReplyOpenCommentId((openId) => {
      if (openId != null) replyDraftsRef.current[String(openId)] = text;
      return openId;
    });
  }, []);

  const closeReplyComposer = useCallback(() => {
    if (replyOpenCommentId != null) {
      replyDraftsRef.current[String(replyOpenCommentId)] = replyDraft;
    }
    setReplyOpenCommentId(null);
  }, [replyOpenCommentId, replyDraft]);

  const submitReply = useCallback(
    (post, parentCommentId, text) => {
      const t = (text || "").trim();
      if (!t || !post?.id || !parentCommentId) return;
      run(`reply-${parentCommentId}`, async () => {
        try {
          await postsApi.addReply(parentCommentId, t);
          await loadReplies(post.id, parentCommentId, { limit: 100 });
          patchCommentOnPost(post.id, parentCommentId, (c) => ({
            ...c,
            repliesExpanded: true,
          }));
          replyDraftsRef.current[String(parentCommentId)] = "";
          setReplyDraft("");
          setReplyOpenCommentId(null);
        } catch (e) {
          if (isPostNotFoundError(e)) {
            dropPostEverywhere(post.id);
            return;
          }
          const msg = getApiErrorMessage(e) || "Не вдалося надіслати відповідь";
          toast.error(msg);
        }
      });
    },
    [run, loadReplies, patchCommentOnPost, dropPostEverywhere]
  );

  const showMoreReplies = useCallback(
    (post, commentId) => {
      if (!post?.id || !commentId) return;
      const comment = (post.comments ?? []).find(
        (c) => String(c?.id) === String(commentId)
      );
      if (!comment) return;
      patchCommentOnPost(post.id, commentId, (c) => ({
        ...c,
        repliesExpanded: true,
      }));
      if (!comment.repliesLoaded) {
        loadReplies(post.id, commentId, { limit: 100 });
      }
    },
    [patchCommentOnPost, loadReplies]
  );

  const onEditComment = useCallback(
    (post, commentId, text, { parentId, isReply } = {}) => {
      const t = (text || "").trim();
      if (!t || !post?.id || !commentId) return;
      patchPost(post.id, (p) => {
        const prevComments = Array.isArray(p.comments) ? p.comments : [];
        let nextComments;
        if (isReply && parentId) {
          nextComments = prevComments.map((c) => {
            if (String(c?.id) !== String(parentId)) return c;
            const replies = (c.replies ?? []).map((r) =>
              String(r?.id) === String(commentId) ? { ...r, content: t } : r
            );
            return { ...c, replies };
          });
        } else {
          nextComments = prevComments.map((c) =>
            String(c?.id) === String(commentId) ? { ...c, content: t } : c
          );
        }
        return {
          ...p,
          comments: nextComments,
          counts: {
            ...p.counts,
            replies: countPostReplies(nextComments),
          },
        };
      });
    },
    [patchPost]
  );

  const onLikeComment = useCallback(
    (post, commentId) => {
      if (!post?.id || likingCommentId) return;

      const id =
        typeof commentId === "object" && commentId !== null
          ? getCommentBackendId(commentId)
          : stringifyCommentId(commentId);

      if (!id || String(id) === String(post.id)) {
        toast.error("Comment id is missing");
        return;
      }

      const comment = findCommentInTree(post.comments, id);

      if (!comment) {
        toast.error("Comment not found");
        return;
      }

      const apiId = getCommentBackendId(comment) ?? id;
      const snapshot = {
        ...comment,
        viewerState: { ...comment.viewerState },
      };

      setLikingCommentId(apiId);
      patchPost(post.id, (p) => ({
        ...p,
        comments: updateCommentInTree(p.comments, apiId, applyCommentLikeToggle),
      }));

      run(`comment-like-${apiId}`, async () => {
        try {
          const res = await postsApi.likeComment(apiId);
          patchPost(post.id, (p) => ({
            ...p,
            comments: updateCommentInTree(p.comments, apiId, (c) =>
              mergeCommentLikeResponse(c, res)
            ),
          }));
        } catch (e) {
          patchPost(post.id, (p) => ({
            ...p,
            comments: updateCommentInTree(p.comments, apiId, () => snapshot),
          }));
          toast.error(getApiErrorMessage(e) || "Не вдалося поставити лайк");
        } finally {
          setLikingCommentId(null);
        }
      });
    },
    [likingCommentId, patchPost, run]
  );

  const onDeleteComment = useCallback(
    (post, commentId, { parentId, isReply } = {}) => {
      if (!post?.id || !commentId) return;
      run(`comment-delete-${post.id}-${commentId}`, async () => {
        try {
          await postsApi.deleteComment(commentId);
          patchPost(post.id, (p) => {
            const prevComments = Array.isArray(p.comments) ? p.comments : [];
            let nextComments;
            if (isReply && parentId) {
              nextComments = prevComments.map((c) => {
                if (String(c?.id) !== String(parentId)) return c;
                const replies = (c.replies ?? []).filter(
                  (r) => String(r?.id) !== String(commentId)
                );
                return {
                  ...c,
                  replies,
                  repliesCount: Math.max(0, (c.repliesCount ?? 0) - 1),
                };
              });
            } else {
              nextComments = prevComments.filter(
                (c) => String(c?.id) !== String(commentId)
              );
            }
            return {
              ...p,
              comments: nextComments,
              counts: {
                ...p.counts,
                comments: isReply
                  ? p.counts?.comments ?? prevComments.length
                  : Math.max(
                      0,
                      (p.counts?.comments ?? prevComments.length) - 1
                    ),
                replies: countPostReplies(nextComments),
              },
            };
          });
          if (!isReply) loadComments(post.id);
        } catch (e) {
          const msg = getApiErrorMessage(e) || "Не вдалося видалити коментар";
          toast.error(msg);
        }
      });
    },
    [run, patchPost, loadComments]
  );

  const openComments = useCallback(
    (postId) => {
      setCommentsOpenPostId((id) => {
        const willOpen = !(id != null && String(id) === String(postId));
        if (!willOpen) {
          setCommentDraft("");
          setReplyOpenCommentId(null);
          setReplyDraft("");
          return null;
        }
        setCommentDraft("");
        setReplyOpenCommentId(null);
        setReplyDraft("");
        loadComments(postId);
        return postId;
      });
    },
    [loadComments]
  );

  const performDeletePost = useCallback(
    (post) => {
      const perms = resolvePostMenuPermissions(post, currentUserId);
      if (!perms.canDelete && !perms.canRemoveFromFeed) return;

      const deleteId = getDeleteTargetPostId(post);
      if (!deleteId) return;

      const removingMyRepost = isMyRepost(post, currentUserId);
      const originalPostId = removingMyRepost
        ? getOriginalPostIdFromRepost(post)
        : null;

      run(`delete-${deleteId}`, async () => {
        setIsDeletingPost(true);
        try {
          await postsApi.deletePost(deleteId);

          setFeedPosts((prev) =>
            removingMyRepost
              ? applyFeedAfterRepostRemoved(prev, deleteId, originalPostId)
              : prev.filter((p) => String(p.id) !== deleteId)
          );

          if (removingMyRepost && originalPostId) {
            syncPostInCaches(originalPostId, (p) => ({
              ...p,
              viewerState: { ...p.viewerState, isReposted: false },
              counts: {
                ...p.counts,
                reposts: Math.max(0, (p.counts?.reposts ?? 0) - 1),
              },
            }));
          }

          clearPostLikeOverride(deleteId);
          removeDeletedPostFromCaches(deleteId);

          setCommentsOpenPostId((openId) => {
            if (openId != null && String(openId) === deleteId) {
              setCommentDraft("");
              return null;
            }
            return openId;
          });
          setDeleteConfirmPost(null);
          toast.success(
            removingMyRepost
              ? "Допис прибрано зі стрічки"
              : "Допис видалено"
          );
        } catch (e) {
          if (isPostNotFoundError(e)) {
            dropPostEverywhere(deleteId);
            setDeleteConfirmPost(null);
            return;
          }
          const status = e?.response?.status;
          let msg = getApiErrorMessage(e) || "Не вдалося видалити пост";
          if (
            removingMyRepost &&
            (status === 401 || status === 403) &&
            /unauthorized|forbidden|доступ/i.test(msg)
          ) {
            msg =
              "Сервер відхилив видалення репосту (401/403). Потрібно дозволити автору DELETE для власного repost (id картки репосту, не оригіналу).";
          }
          toast.error(msg);
        } finally {
          setIsDeletingPost(false);
        }
      });
    },
    [run, setFeedPosts, dropPostEverywhere, currentUserId]
  );

  const requestDeletePost = useCallback(
    (post) => {
      const perms = resolvePostMenuPermissions(post, currentUserId);
      if (!perms.canDelete && !perms.canRemoveFromFeed) return;
      setDeleteConfirmPost(post);
    },
    [currentUserId]
  );

  const cancelDeletePost = useCallback(() => {
    if (!isDeletingPost) setDeleteConfirmPost(null);
  }, [isDeletingPost]);

  const confirmDeletePost = useCallback(() => {
    if (deleteConfirmPost) performDeletePost(deleteConfirmPost);
  }, [deleteConfirmPost, performDeletePost]);

  const openEditPost = useCallback(
    (post) => {
      const { canEdit } = resolvePostMenuPermissions(post, currentUserId);
      if (!canEdit) return;
      setEditingPost(post);
    },
    [currentUserId]
  );

  const closeEditPost = useCallback(() => {
    if (!isSavingEditPost) setEditingPost(null);
  }, [isSavingEditPost]);

  const saveEditPost = useCallback(
    async ({ text, media, location }) => {
      const post = editingPost;
      const { canEdit } = resolvePostMenuPermissions(post, currentUserId);
      if (!post?.id || !canEdit) return;
      setIsSavingEditPost(true);
      try {
        const updated = await postsApi.update(post.id, {
          fullText: text,
          media,
          location,
        });
        const mapped = mapApiPostToFeedItem(updated);
        if (mapped) {
          patchPost(post.id, (p) => ({
            ...mapped,
            comments: p.comments,
            counts: {
              ...mapped.counts,
              comments: p.counts?.comments ?? mapped.counts?.comments,
              replies: p.counts?.replies ?? mapped.counts?.replies,
            },
          }));
        }
        setEditingPost(null);
        toast.success("Допис оновлено");
      } catch (e) {
        if (isPostNotFoundError(e)) {
          dropPostEverywhere(post.id);
          setEditingPost(null);
          return;
        }
        const msg = getApiErrorMessage(e) || "Не вдалося оновити допис";
        toast.error(msg);
        throw e;
      } finally {
        setIsSavingEditPost(false);
      }
    },
    [editingPost, patchPost, dropPostEverywhere, currentUserId]
  );

  const onSave = useCallback(
  (post) => {
    if (!post?.id) return;

    run(`save-${post.id}`, async () => {
      const wasSaved = post.viewerState?.isSaved === true;

      try {
        if (wasSaved) {
          await postsApi.unsave(post.id);
        } else {
          await postsApi.save(post.id);
        }

        patchPost(post.id, (p) => ({
          ...p,
          viewerState: {
            ...p.viewerState,
            isSaved: !wasSaved,
          },
          counts: {
            ...p.counts,
            saves: wasSaved
              ? Math.max((p.counts?.saves ?? 1) - 1, 0)
              : (p.counts?.saves ?? 0) + 1,
          },
        }));
      } catch (e) {
        const msg =
          getApiErrorMessage(e) ||
          (wasSaved
            ? "Не вдалося прибрати пост зі збережених"
            : "Не вдалося зберегти пост");

        toast.error(msg);
      }
    });
  },
  [patchPost, run]
); 

  const openSharePost = useCallback((post) => {
    if (post?.id) setSharePost(post);
  }, []);

  const closeSharePost = useCallback(() => {
    setSharePost(null);
  }, []);

  const handleSendToUsers = useCallback(
    async ({ postId, recipientUserIds, message }) => {
      if (!postId || !Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
        throw new Error("Оберіть отримувачів");
      }
      try {
        return await postsApi.send(postId, {
          recipientUserIds,
          message: String(message ?? "").trim(),
        });
      } catch (e) {
        if (isPostNotFoundError(e)) {
          dropPostEverywhere(postId);
        }
        const msg = getApiErrorMessage(e) || "Не вдалося надіслати пост";
        throw new Error(msg);
      }
    },
    [dropPostEverywhere]
  );

  return {
    commentsOpenPostId,
    isCommentsOpen,
    commentDraft,
    setCommentDraft,
    toggleCommentsOpen: openComments,
    submitComment,
    onDeleteComment,
    onLikeComment,
    likingCommentId,
    onEditComment,
    loadComments,
    replyOpenCommentId,
    replyDraft,
    setReplyDraft: setReplyDraftForOpen,
    openReplyComposer,
    closeReplyComposer,
    submitReply,
    showMoreReplies,
    loadReplies,
    countPostReplies,
    onLike,
    handleRepostToFeed,
    onDeletePost: requestDeletePost,
    requestDeletePost,
    cancelDeletePost,
    confirmDeletePost,
    deleteConfirmPost,
    deleteConfirmIsRepost: deleteConfirmPost
      ? isMyRepost(deleteConfirmPost, currentUserId)
      : false,
    isDeletingPost,
    openEditPost,
    closeEditPost,
    saveEditPost,
    editingPost,
    isSavingEditPost,
    onSave,
    sharePost,
    openSharePost,
    closeSharePost,
    handleSendToUsers,
  };
}
