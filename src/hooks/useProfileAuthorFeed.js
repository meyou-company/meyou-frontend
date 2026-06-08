import { useCallback, useEffect, useState } from "react";
import { postsApi } from "../services/postsApi";
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
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(Boolean(enabled && postsAuthorId));
  const [feedError, setFeedError] = useState("");
  const currentUserId = useAuthStore((s) => s.user?.id);

  const reloadFeed = useCallback(async () => {
    if (!postsAuthorId) return;
    const list = await postsApi.listByAuthor(postsAuthorId);
    const mapped = sortPostsByNewest(
      (Array.isArray(list) ? list : []).map(mapApiPostToFeedItem).filter(Boolean)
    );
    setFeedPosts(applyPersistedLikes(mapped));
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
        setFeedPosts(parsed);
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
        setFeedPosts([]);
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
        const list = await dedupeAsync(`posts:author:${postsAuthorId}`, () =>
          postsApi.listByAuthor(postsAuthorId),
        );
        const mapped = sortPostsByNewest(
          (Array.isArray(list) ? list : []).map(mapApiPostToFeedItem).filter(Boolean)
        );
        if (!cancelled) setFeedPosts(applyPersistedLikes(mapped));
      } catch (err) {
        if (!cancelled) {
          const raw = getApiErrorMessage(err);
          const pretty = /^Cannot GET\s+/i.test(raw || "")
            ? "Не вдалося завантажити пости профілю (маршрут недоступний на бекенді)."
            : /^Internal server error$/i.test(raw || "")
              ? "Тимчасова помилка сервера при завантаженні постів."
              : raw;
          setFeedError(
            pretty
              ? pretty
              : "Не вдалося завантажити пости. Спробуйте оновити сторінку."
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

  return {
    feedPosts,
    setFeedPosts,
    feedLoading,
    feedError,
    feedActions,
    feedCacheKey,
  };
}
