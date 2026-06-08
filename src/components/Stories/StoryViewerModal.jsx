import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storiesApi } from "../../services/storiesApi";
import { storyReactions } from "../../constants/storyReactions";
import profileIcons from "../../constants/profileIcons";
import AppHeader from "../Layout/AppHeader";
import "./StoryViewerModal.scss";

const DEFAULT_DURATION = 500000;
const storyViewsCache = new Map();
const storyViewsRequests = new Map();

function getStoryId(story) {
  return story?.id || story?._id || story?.storyId || null;
}

function getStoryMediaUrl(story) {
  return story?.mediaUrl || story?.media_url || story?.url || story?.media?.url || "";
}

function getStoryMediaType(story) {
  return String(story?.mediaType || story?.media_type || story?.type || "image").toLowerCase();
}

function getAuthorName(author) {
  return (
    [author?.firstName, author?.lastName].filter(Boolean).join(" ").trim() ||
    author?.username ||
    "User"
  );
}

function getStoryTimeLabel(story) {
  const rawDate = story?.createdAt || story?.created_at;
  if (!rawDate) return "";

  const diffMs = Date.now() - new Date(rawDate).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин.`;
  if (diffHours < 24) return `${diffHours} ч.`;

  return "24 ч.";
}

function normalizeStoryViewUser(item) {
  const user = item?.user || item?.viewer || item;

  if (!user) return null;

  return {
    id: user.id || user._id,
    username: user.username || user.nick || user.nickname || "",
    avatarUrl: user.avatarUrl || user.avatar || null,
  };
}

function getStoryViewsCount(story, views = []) {
  return (
    story?.viewsCount ??
    story?.viewCount ??
    story?.views_count ??
    story?.countViews ??
    views.length ??
    0
  );
}

function extractStoryViewsList(response) {
  return Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.views)
        ? response.views
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.data?.views)
              ? response.data.views
              : [];
}

export default function StoryViewerModal({
  isOpen,
  groups = [],
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  currentUserId,
  onClose,
  onViewed,
  onDeleteStory,
  onOpenProfile,
}) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [mediaOrientation, setMediaOrientation] = useState("unknown");
  const [storyViews, setStoryViews] = useState([]);
  const [storyViewsLoading, setStoryViewsLoading] = useState(false);

  const navigate = useNavigate();

  const viewedRef = useRef(new Set());

  const safeGroups = Array.isArray(groups) ? groups : [];

  const currentGroup = safeGroups[groupIndex];
  const stories = Array.isArray(currentGroup?.stories) ? currentGroup.stories : [];
  const currentStory = stories[storyIndex];

  const storyId = getStoryId(currentStory);
  const mediaUrl = getStoryMediaUrl(currentStory);
  const mediaType = getStoryMediaType(currentStory);
  const author = currentGroup?.author || currentStory?.author;
  const authorAvatar = author?.avatarUrl || author?.avatar || profileIcons.userStory;
  const isOwnStory =
    String(author?.id ?? currentStory?.authorId ?? "") === String(currentUserId ?? "");
  const handleOpenAuthorProfile = () => {
    const username = author?.username || author?.nick || author?.nickname;

    if (!username) return;

    onClose?.();
    onOpenProfile?.(username);
  };

  const hasStories = safeGroups.length > 0 && stories.length > 0 && currentStory;
  const setMediaSize = (width, height) => {
    if (!width || !height) {
      setMediaOrientation("unknown");
      return;
    }

    setMediaOrientation(width > height ? "landscape" : "portrait");
  };

  const goNext = useCallback(() => {
    setProgress(0);
    setDuration(DEFAULT_DURATION);

    setStoryIndex((prevStoryIndex) => {
      const currentStories = Array.isArray(safeGroups[groupIndex]?.stories)
        ? safeGroups[groupIndex].stories
        : [];

      if (prevStoryIndex < currentStories.length - 1) {
        return prevStoryIndex + 1;
      }

      if (groupIndex < safeGroups.length - 1) {
        setGroupIndex((prevGroupIndex) => prevGroupIndex + 1);
        return 0;
      }

      onClose?.();
      return prevStoryIndex;
    });
  }, [groupIndex, safeGroups, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setDuration(DEFAULT_DURATION);

    setStoryIndex((prevStoryIndex) => {
      if (prevStoryIndex > 0) return prevStoryIndex - 1;

      if (groupIndex > 0) {
        const prevGroup = safeGroups[groupIndex - 1];
        const prevStories = Array.isArray(prevGroup?.stories) ? prevGroup.stories : [];
        setGroupIndex((prevGroupIndex) => prevGroupIndex - 1);
        return Math.max(prevStories.length - 1, 0);
      }

      return 0;
    });
  }, [groupIndex, safeGroups]);

  useEffect(() => {
    if (!isOpen) return;

    setGroupIndex(initialGroupIndex || 0);
    setStoryIndex(initialStoryIndex || 0);
    setProgress(0);
    setDuration(DEFAULT_DURATION);
  }, [isOpen, initialGroupIndex, initialStoryIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !storyId || viewedRef.current.has(storyId)) return;

    // Свои stories не отмечаем как просмотренные
    if (isOwnStory) return;

    viewedRef.current.add(storyId);

    storiesApi.markViewed(storyId)
      .then(() => onViewed?.(storyId))
      .catch((e) => {
        console.error("[story-view] failed", e);
      });
  }, [isOpen, storyId, isOwnStory, onViewed]);

  useEffect(() => {
    if (!isOpen || !storyId) return;

    let cancelled = false;

    const loadViews = async () => {
      // чужим stories просмотры не нужны
      if (!isOwnStory) {
        setStoryViews([]);
        return;
      }

      const cached = storyViewsCache.get(storyId);

      if (cached) {
        setStoryViews(cached);
        return;
      }

      if (storyViewsRequests.has(storyId)) {
        const cachedFromPending = await storyViewsRequests.get(storyId);

        if (!cancelled) {
          setStoryViews(Array.isArray(cachedFromPending) ? cachedFromPending : []);
        }

        return;
      }

      try {
        setStoryViewsLoading(true);

        const request = storiesApi.getViews(storyId).then((response) => {
          const rawList = extractStoryViewsList(response);
          return rawList.map(normalizeStoryViewUser).filter(Boolean);
        });

        storyViewsRequests.set(storyId, request);

        const normalizedViews = await request;

        if (cancelled) return;

        storyViewsCache.set(storyId, normalizedViews);
        storyViewsRequests.delete(storyId);

        setStoryViews(normalizedViews);
      } catch (e) {
        storyViewsRequests.delete(storyId);
        if (!cancelled) {
          const fallbackViews = Array.isArray(currentStory?.views)
            ? currentStory.views
            : Array.isArray(currentStory?.viewers)
              ? currentStory.viewers
              : Array.isArray(currentStory?.viewedBy)
                ? currentStory.viewedBy
                : [];

          setStoryViews(fallbackViews.map(normalizeStoryViewUser).filter(Boolean));
        }
      } finally {
        if (!cancelled) setStoryViewsLoading(false);
      }
    };

    loadViews();

    return () => {
      cancelled = true;
    };
  }, [isOpen, storyId, isOwnStory, currentStory]);

  useEffect(() => {
    if (!isOpen || !hasStories) return undefined;

    const stepMs = 50;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + (stepMs / duration) * 100;

        if (next >= 100) {
          window.clearInterval(interval);
          goNext();
          return 100;
        }

        return next;
      });
    }, stepMs);

    return () => window.clearInterval(interval);
  }, [isOpen, hasStories, duration, storyId, goNext]);

  const progressBars = useMemo(() => {
    return stories.map((story, index) => {
      if (index < storyIndex) return 100;
      if (index > storyIndex) return 0;
      return progress;
    });
  }, [stories, storyIndex, progress]);

  const storyViewersOnly = (Array.isArray(storyViews) ? storyViews : []).filter(
    (viewer) => String(viewer?.id ?? "") !== String(author?.id ?? "")
  );

  const visibleViewers = storyViewersOnly.slice(0, 3);
  const viewsCount = storyViewersOnly.length;

  if (!isOpen || !hasStories) return null;

  return (
    <div className="storyViewer" role="dialog" aria-modal="true" aria-label="Перегляд story">
      <AppHeader
        onGoProfile={() => {
          onClose?.();
          navigate("/profile");
        }}
        onGoExplore={() => {
          onClose?.();
          navigate("/search");
        }}
        onGoWallet={() => {
          onClose?.();
          navigate("/wallet");
        }}
        onGoVipChat={() => {
          onClose?.();
          navigate("/vip-chat");
        }}
        onGoHome={() => {
          onClose?.();
          navigate("/first-page");
        }}
      />

      <div className="storyViewer__page">
        <div className="storyViewer__bgDots" aria-hidden="true" />

        <div className="storyViewer__card">
          <div className="storyViewer__progress">
            {progressBars.map((value, index) => (
              <div className="storyViewer__progressTrack" key={stories[index]?.id || index}>
                <span style={{ width: `${value}%` }} />
              </div>
            ))}
          </div>

          <button className="storyViewer__author" onClick={handleOpenAuthorProfile}>
            <img src={authorAvatar} alt="" />
            <div className="storyViewer__authorText">
              <div>
                <span className="storyViewer__authorName">{getAuthorName(author)}</span>
                <span className="storyViewer__time">{getStoryTimeLabel(currentStory)}</span>
              </div>
              {/* <span className="storyViewer__music">♫ random music</span> */}
            </div>
          </button>

          <button
            type="button"
            className="storyViewer__menu"
            aria-label="Більше"
          >
            ⋮
          </button>

          <button
            type="button"
            className="storyViewer__tap storyViewer__tap--left"
            onClick={goPrev}
            aria-label="Попередня story"
          />

          <button
            type="button"
            className="storyViewer__tap storyViewer__tap--right"
            onClick={goNext}
            aria-label="Наступна story"
          />

          <div className={`storyViewer__mediaWrap storyViewer__mediaWrap--${mediaOrientation}`}>
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                className="storyViewer__media"
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;

                  setMediaSize(video.videoWidth, video.videoHeight);

                  const seconds = video.duration;
                  if (Number.isFinite(seconds) && seconds > 0) {
                    setDuration(Math.min(Math.max(seconds * 1000, 3000), 15000));
                  }
                }}
                onEnded={goNext}
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                className="storyViewer__media"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setMediaSize(img.naturalWidth, img.naturalHeight);
                }}
              />
            )}
          </div>

          {currentStory?.text && (
            <div className="storyViewer__caption">{currentStory.text}</div>
          )}
        </div>

        {isOwnStory ? (
          <div className="storyViewer__actions">
            <button type="button" className="storyViewer__action">
              <div className="storyViewer__viewers">
                {visibleViewers.length > 0 ? (
                  visibleViewers.map((viewer, index) => (
                    <img
                      key={viewer.id || index}
                      src={viewer.avatarUrl || profileIcons.userStory}
                      alt=""
                    />
                  ))
                ) : (
                  <span className="storyViewer__viewersEmpty">0</span>
                )}
              </div>

              <span>
                {storyViewsLoading ? "..." : `${viewsCount} просмотров`}
              </span>
            </button>

            <button type="button" className="storyViewer__action">
              <img
                src={profileIcons.storyForward}
                alt=""
                className="storyViewer__actionImg"
              />
              <span>Переслать</span>
            </button>

            <button type="button" className="storyViewer__action">
              <div className="storyViewer__shareIconsWrap">
                <img
                  src={profileIcons.profileInfoTelegram}
                  alt="Telegram"
                  className="storyViewer__shareIcons"
                />
                <img
                  src={profileIcons.profileInfoInstagram}
                  alt="Instagram"
                  className="storyViewer__shareIcons"
                />
              </div>
              <span>Поделиться</span>
            </button>

            <button type="button" className="storyViewer__action">
              <span className="storyViewer__actionIcon">@</span>
              <span>Отметить</span>
            </button>

            <button
              type="button"
              className="storyViewer__action"
              onClick={() => onDeleteStory?.(storyId)}
            >
              <img
                src={profileIcons.storyDelete}
                alt=""
                className="storyViewer__actionIcon storyViewer__actionIcon--delete"
              />
              <span className="text-red-600">Удалить</span>
            </button>
          </div>
        ) : (
          <div className="storyViewer__viewerReplyBar">
            <button type="button" className="storyViewer__messageBtn">
              Отправить сообщение
            </button>

            <div className="storyViewer__reactions">
              {storyReactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  className="storyViewer__reactionBtn"
                >
                  <img src={reaction.icon} alt="" />
                </button>
              ))}
            </div>

            <button type="button" className="storyViewer__sendBtn">
              <img src={profileIcons.storyForward} alt="" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}