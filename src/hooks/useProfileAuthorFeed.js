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
import { liveStreamsApi } from "../services/liveStreamsApi";

function getPlaybackUrl(value, depth = 0) {
  if (!value || depth > 4) return null;

  const candidates = [
    value.recordingUrl,
    value.playbackUrl,
    value.videoUrl,
    value.hlsUrl,
    value.mp4Url,
    value.downloadUrl,
    value.assetUrl,
    value.url,
  ];
  const direct = candidates.find((url) =>
    typeof url === "string" && /^https?:\/\//i.test(url)
  );
  if (direct) return direct;

  for (const nested of [value.data, value.result, value.recording, value.playback, value.media, value.asset]) {
    const url = getPlaybackUrl(nested, depth + 1);
    if (url) return url;
  }
  return null;
}

async function loadSavedLiveReplays(username, authorId) {
  if (!username) return [];

  try {
    const streams = await liveStreamsApi.listByUsername(username);
    const savedStreams = (Array.isArray(streams) ? streams : []).filter((stream) =>
      stream?.isSaved === true && String(stream?.status || "").toUpperCase() === "ENDED"
    );

    const replayItems = await Promise.all(savedStreams.map(async (stream) => {
      const streamId = stream.id || stream._id || stream.liveStreamId;
      const recordingStatus = String(stream.recordingStatus || "").toUpperCase();
      if (recordingStatus === "FAILED") return null;
      let playbackUrl = getPlaybackUrl(stream);
      if (!playbackUrl && streamId) {
        try {
          playbackUrl = getPlaybackUrl(await liveStreamsApi.getPlayback(streamId));
        } catch {
          // Recording can still be processing; keep the replay card visible.
        }
      }

      if (!playbackUrl && recordingStatus === "NONE") return null;

      const endedAtMs = Date.parse(stream.endedAt || stream.updatedAt || "");
      const isWithinProcessingWindow =
        Number.isFinite(endedAtMs) && Date.now() - endedAtMs < 15 * 60 * 1_000;
      const isRecordingProcessing =
        !playbackUrl && recordingStatus === "PROCESSING" && isWithinProcessingWindow;

      return {
        id: `live-${streamId}`,
        liveStreamId: streamId,
        kind: "liveReplay",
        authorId: authorId != null ? String(authorId) : null,
        text: "Запись прямого эфира",
        media: playbackUrl ? [{ url: playbackUrl, type: "VIDEO", order: 0 }] : [],
        createdAt: stream.endedAt || stream.startedAt || stream.createdAt || null,
        location: "",
        permissions: {
          canEdit: false,
          canDelete: false,
          isOwner: false,
        },
        viewerState: { isLiked: false, isSaved: false, isReposted: false },
        comments: [],
        counts: {
          likes: stream.reactionsCount ?? stream.likesCount ?? 0,
          comments: stream.messagesCount ?? stream.commentsCount ?? 0,
          reposts: 0,
          saves: 0,
          replies: 0,
          views: stream.viewersCount ?? stream.viewerCount ?? 0,
        },
        isRecordingProcessing,
        isRecordingUnavailable: !playbackUrl && !isRecordingProcessing,
      };
    }));
    return replayItems.filter(Boolean);
  } catch {
    return [];
  }
}

async function loadProfileItems(postsAuthorId, username) {
  const [{ items, total }, liveReplays] = await Promise.all([
    postsApi.listByAuthorWithMeta(postsAuthorId),
    loadSavedLiveReplays(username, postsAuthorId),
  ]);
  const posts = (Array.isArray(items) ? items : []).map(mapApiPostToFeedItem).filter(Boolean);
  const merged = sortPostsByNewest([...posts, ...liveReplays]);
  return {
    items: merged,
    total: (typeof total === "number" ? total : posts.length) + liveReplays.length,
  };
}

/**
 * Завантаження стрічки постів автора (GET /posts/users/:id/posts) + кеш у localStorage.
 * `enabled: false` — пропустити fetch (для відкладеного завантаження на профілі).
 */
export function useProfileAuthorFeed(postsAuthorId, { enabled = true, username = "" } = {}) {
  const [feedPosts, setFeedPostsState] = useState([]);
  const [feedTotal, setFeedTotal] = useState(null);
  const [feedLoading, setFeedLoading] = useState(Boolean(enabled && postsAuthorId));
  const [feedError, setFeedError] = useState("");
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isFeedOwner = Boolean(
    currentUserId && postsAuthorId && String(currentUserId) === String(postsAuthorId)
  );

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
    const { items, total } = await loadProfileItems(postsAuthorId, username);
    setFeedPostsState(applyPersistedLikes(items.map((item) =>
      item.kind === "liveReplay"
        ? { ...item, permissions: { ...item.permissions, canDelete: isFeedOwner, isOwner: isFeedOwner } }
        : item
    )));
    setFeedTotal(total);
  }, [isFeedOwner, postsAuthorId, username]);

  const deleteLiveReplay = useCallback(async (liveReplay) => {
    const liveStreamId = liveReplay?.liveStreamId;
    if (!isFeedOwner || !liveStreamId) return;

    await liveStreamsApi.updateSettings(liveStreamId, { isSaved: false });
    setFeedPostsState((current) => current.filter((item) => item.id !== liveReplay.id));
    setFeedTotal((current) =>
      typeof current === "number" ? Math.max(0, current - 1) : current
    );
  }, [isFeedOwner]);

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
          `profile-feed:${postsAuthorId}:${username}`,
          () => loadProfileItems(postsAuthorId, username),
        );
        if (!cancelled) {
          setFeedPostsState(applyPersistedLikes(items.map((item) =>
            item.kind === "liveReplay"
              ? { ...item, permissions: { ...item.permissions, canDelete: isFeedOwner, isOwner: isFeedOwner } }
              : item
          )));
          setFeedTotal(total);
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
  }, [postsAuthorId, enabled, isFeedOwner, username]);

  useEffect(() => {
    if (!enabled || !feedPosts.some((item) => item.kind === "liveReplay" && item.isRecordingProcessing)) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      reloadFeed().catch(() => {});
    }, 5_000);
    return () => window.clearInterval(intervalId);
  }, [enabled, feedPosts, reloadFeed]);

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
    deleteLiveReplay,
  };
}
