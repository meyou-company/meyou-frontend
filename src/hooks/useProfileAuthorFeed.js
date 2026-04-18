import { useEffect, useState } from "react";
import { postsApi } from "../services/postsApi";
import { mapApiPostToFeedItem } from "../utils/mapApiPostToFeedItem";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { applyPersistedLikes } from "../utils/postLikePersistence";
import { usePostFeedActions } from "./usePostFeedActions";

/**
 * Завантаження стрічки постів автора (GET /posts/users/:id/posts) + кеш у localStorage.
 * Використовується на своєму профілі та на сторінці відвідуваного користувача.
 */
export function useProfileAuthorFeed(postsAuthorId) {
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const feedActions = usePostFeedActions(setFeedPosts);
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
      }
    } catch {
      // ignore invalid cache
    }
  }, [feedCacheKey]);

  useEffect(() => {
    if (!feedCacheKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(feedCacheKey, JSON.stringify(feedPosts));
    } catch {
      // ignore storage errors
    }
  }, [feedCacheKey, feedPosts]);

  useEffect(() => {
    let cancelled = false;
    if (!postsAuthorId) {
      setFeedPosts([]);
      setFeedError("");
      setFeedLoading(false);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        setFeedLoading(true);
        setFeedError("");
        const list = await postsApi.listByAuthor(postsAuthorId);
        const mapped = (Array.isArray(list) ? list : [])
          .map(mapApiPostToFeedItem)
          .filter(Boolean);
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
  }, [postsAuthorId]);

  return {
    feedPosts,
    setFeedPosts,
    feedLoading,
    feedError,
    feedActions,
    feedCacheKey,
  };
}
