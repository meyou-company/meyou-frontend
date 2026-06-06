import { useEffect, useRef } from "react";
import { videosApi } from "../services/videosApi";

const SESSION_STORAGE_KEY = "meyou_video_views_registered";
const MIN_WATCH_SECONDS = 2.5;
const MIN_VISIBLE_RATIO = 0.5;

function readSessionViewedIds() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function markSessionViewed(videoId) {
  if (!videoId) return;
  const ids = readSessionViewedIds();
  ids.add(videoId);
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function hasSessionViewed(videoId) {
  return readSessionViewedIds().has(videoId);
}

/**
 * Registers a unique video view after real playback:
 * - logged-in viewer only
 * - not the author
 * - at least 50% of the player visible
 * - watched at least MIN_WATCH_SECONDS while playing
 * - one POST per video per browser session
 */
export function useVideoViewRegistration({
  videoRef,
  videoId,
  authorId,
  currentUserId,
  isAuthed,
  isActive,
  onViewRecorded,
}) {
  const registeredRef = useRef(false);

  useEffect(() => {
    registeredRef.current = false;
  }, [videoId]);

  useEffect(() => {
    if (!isActive || !isAuthed || !videoId || !videoRef?.current) {
      return undefined;
    }

    if (!currentUserId || authorId === currentUserId) {
      return undefined;
    }

    if (hasSessionViewed(videoId)) {
      return undefined;
    }

    const videoEl = videoRef.current;
    let visibleEnough = false;
    let cancelled = false;

    const registerView = async () => {
      if (cancelled || registeredRef.current || hasSessionViewed(videoId)) {
        return;
      }

      registeredRef.current = true;
      markSessionViewed(videoId);

      try {
        const result = await videosApi.registerView(videoId);
        if (!cancelled && result?.viewsCount != null) {
          onViewRecorded?.(videoId, result.viewsCount, result.alreadyViewed);
        }
      } catch (err) {
        console.error("[video-view] register failed", err);
      }
    };

    const maybeRegister = () => {
      if (!visibleEnough || videoEl.paused) return;
      if (videoEl.currentTime < MIN_WATCH_SECONDS) return;
      registerView();
    };

    const onTimeUpdate = () => {
      maybeRegister();
    };

    const onPlaying = () => {
      maybeRegister();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        visibleEnough = (entry?.intersectionRatio ?? 0) >= MIN_VISIBLE_RATIO;
        maybeRegister();
      },
      { threshold: [0, MIN_VISIBLE_RATIO, 1] },
    );

    observer.observe(videoEl);
    videoEl.addEventListener("timeupdate", onTimeUpdate);
    videoEl.addEventListener("playing", onPlaying);

    return () => {
      cancelled = true;
      observer.disconnect();
      videoEl.removeEventListener("timeupdate", onTimeUpdate);
      videoEl.removeEventListener("playing", onPlaying);
    };
  }, [
    isActive,
    isAuthed,
    videoId,
    authorId,
    currentUserId,
    videoRef,
    onViewRecorded,
  ]);
}
