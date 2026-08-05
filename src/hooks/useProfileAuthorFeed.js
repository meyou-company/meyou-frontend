import { useCallback, useEffect, useState } from "react";
import { postsApi } from "../services/postsApi";
import { i18n } from "../i18n";
import { mapApiPostToFeedItem } from "../utils/mapApiPostToFeedItem";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { applyPersistedLikes } from "../utils/postLikePersistence";
import { sortPostsByNewest } from "../utils/repostFeed";
import { dedupeAsync } from "../utils/dedupeAsync";
import { useAuthStore } from "../zustand/useAuthStore";
import { usePostFeedActions } from "./usePostFeedActions";

/**
 * Завантаження стрічки постів автора (GET /posts/users/:id/posts) + кеш у localStorage.
 * `enabled: false` — пропустити fetch (для відкладеного завантаження на профілі).
 */
export function useProfileAuthorFeed(postsAuthorId, { enabled = true } = {}) {
  const [feedPosts, setFeedPostsState] = useState([]);
  const [feedTotal, setFeedTotal] = useState(null);
  const [feedLoading, setFeedLoading] = useState(Boolean(enabled && postsAuthorId));
  const [feedError, setFeedError] = useState("");
  const currentUserId = useAuthStore((s) => s.user?.id);

  const setFeedPosts = useCallback((updater) => {
    setFeedPostsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const nextList = Array.isArray(next) ? next : [];
      const prevLen = Array.isArray(prev) ? prev.length : 0;
      const delta = nextList.length - prevLen;
      if (delta !== 0) {
        setFeedTotal((total) => {
          if (typeof total !== "number" || !Number.isFinite(total)) {
            return nextList.length;
          }
          return Math.max(0, total + delta);
        });
      }
      return nextList;
    });
  }, []);

  const reloadFeed = useCallback(async () => {
    if (!postsAuthorId) return;
    const { items, total } = await postsApi.listByAuthorWithMeta(postsAuthorId);
    const mapped = sortPostsByNewest(
      (Array.isArray(items) ? items : []).map(mapApiPostToFeedItem).filter(Boolean)
    );
    setFeedPostsState(applyPersistedLikes(mapped));
    setFeedTotal(typeof total === "number" ? total : mapped.length);
  }, [postsAuthorId]);

  const feedActions = usePostFeedActions(setFeedPosts, {
    currentUserId,
    feedOwnerId: postsAuthorId,
    refetchFeed: reloadFeed,
  });
  const feedCacheKey = postsAuthorId
    ? `profile-feed-cache:${String(postsAuthorId)}`
    : "";

  useEffect(() => {
    if (!feedCacheKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(feedCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFeedPostsState(parsed);
        setFeedTotal((prev) =>
          typeof prev === "number" && prev >= parsed.length ? prev : parsed.length
        );
        setFeedError("");
        setFeedLoading(false);
      }
    } catch {
      // ignore invalid cache
    }
  }, [feedCacheKey]);

  useEffect(() => {
    if (!feedCacheKey || typeof window === "undefined") return;
    if (!feedPosts.length) return;
    try {
      window.localStorage.setItem(feedCacheKey, JSON.stringify(feedPosts));
    } catch {
      // ignore storage errors
    }
  }, [feedCacheKey, feedPosts]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !postsAuthorId) {
      if (!postsAuthorId) {
        setFeedPostsState([]);
        setFeedTotal(null);
        setFeedError("");
      }
      setFeedLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setFeedLoading(true);
        setFeedError("");
        const { items, total } = await dedupeAsync(
          `posts:author:${postsAuthorId}`,
          () => postsApi.listByAuthorWithMeta(postsAuthorId),
        );
        const mapped = sortPostsByNewest(
          (Array.isArray(items) ? items : []).map(mapApiPostToFeedItem).filter(Boolean)
        );
        if (!cancelled) {
          setFeedPostsState(applyPersistedLikes(mapped));
          setFeedTotal(typeof total === "number" ? total : mapped.length);
        }
      } catch (err) {
        if (!cancelled) {
          const raw = getApiErrorMessage(err);
          const pretty = /^Cannot GET\s+/i.test(raw || "")
            ? i18n.t('feed.error.profileRoute')
            : /^Internal server error$/i.test(raw || "")
              ? i18n.t('feed.error.profileServer')
              : raw;
          setFeedError(
            pretty
              ? pretty
              : i18n.t('feed.error.profileLoad')
          );
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postsAuthorId, enabled]);

  const postsCount =
    typeof feedTotal === "number" && Number.isFinite(feedTotal) && feedTotal >= 0
      ? feedTotal
      : feedPosts.length;

  return {
    feedPosts,
    setFeedPosts,
    feedLoading,
    feedError,
    feedActions,
    feedCacheKey,
    postsCount,
  };
}
