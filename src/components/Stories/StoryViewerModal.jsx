import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LuBan,
  LuFlag,
  LuMessageCircle,
  LuRefreshCw,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { storiesApi } from "../../services/storiesApi";
import { conversationsApi } from "../../services/conversationsApi";
import { storyReactions } from "../../constants/storyReactions";
import profileIcons from "../../constants/profileIcons";
import AppHeader from "../Layout/AppHeader";
import "./StoryViewerModal.scss";
import StoryUploadModal from "./StoryUploadModal";

const DEFAULT_DURATION = 500000;
const IMAGE_DURATION = 10000;
const MAX_VIDEO_DURATION = 60000;
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

function getStoryDurationMs(story, mediaType) {
  if (mediaType !== "video") return IMAGE_DURATION;

  const durationSec =
    story?.durationSec ||
    story?.duration_sec ||
    story?.duration ||
    60;

  return Math.min(Math.max(Number(durationSec) * 1000, 1000), MAX_VIDEO_DURATION);
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
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName || user.name,
    avatarUrl: user.avatarUrl || user.avatar || null,
    isFollower:
      item?.isFollower ??
      item?.isSubscriber ??
      user?.isFollower ??
      user?.isSubscriber ??
      false,
    reactions:
      item?.reactions ||
      item?.reactionTypes ||
      item?.reaction ||
      item?.type ||
      user?.reactions ||
      [],
  };
}

function getUserDisplayName(user) {
  return (
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "User"
  );
}

function normalizeReactionList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function getReactionGlyph(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("laugh") || normalized.includes("smile")) return "😂";
  if (normalized.includes("wow") || normalized.includes("surprise")) return "😮";
  if (normalized.includes("cry") || normalized.includes("sad")) return "😢";
  if (normalized.includes("fire")) return "🔥";
  if (normalized.includes("thumb")) return "👍";
  return "❤️";
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

function StoryAnalyticsModal({
  analytics,
  analyticsLoading,
  currentStory,
  stories,
  storyIndex,
  storyViewersOnly,
  activeTab,
  onTabChange,
  onRefresh,
  onAddStory,
  onSelectStory,
  onSelectViewer,
  onClose,
}) {
  const reactions = analytics?.reactionsByType || analytics?.reactionsGrouped || {};
  const rawViewers = analytics?.viewersPreview || analytics?.viewers || storyViewersOnly || [];
  const viewers = rawViewers.map(normalizeStoryViewUser).filter(Boolean);
  const viewsCount = analytics?.viewsCount ?? currentStory?.viewsCount ?? storyViewersOnly?.length ?? 0;
  const sharesCount = analytics?.sharesCount ?? analytics?.shareCount ?? currentStory?.sharesCount ?? 0;
  const reactionsCount = analytics?.reactionsCount ?? currentStory?.reactionsCount ?? 0;
  const activeStoryThumbRef = useRef(null);
  const safeStories = useMemo(() => (Array.isArray(stories) ? stories : []), [stories]);
  const activeStoryIndex = Math.min(Math.max(storyIndex, 0), Math.max(safeStories.length - 1, 0));

  useEffect(() => {
    activeStoryThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeStoryIndex, safeStories.length]);

  const renderStoryThumb = (index) => {
    const story = safeStories[index];
    if (!story) return null;

    const mediaUrl = getStoryMediaUrl(story);
    const mediaType = getStoryMediaType(story);
    const isActive = index === activeStoryIndex;

    return (
      <button
        type="button"
        key={getStoryId(story) || index}
        ref={isActive ? activeStoryThumbRef : null}
        className={`storyStatsModal__thumb ${isActive ? "is-active" : ""}`}
        onClick={() => onSelectStory(index)}
        aria-label={`Story ${index + 1}`}
      >
        {mediaType === "video" ? (
          <video src={mediaUrl} muted playsInline preload="metadata" />
        ) : (
          <img src={mediaUrl} alt="" />
        )}
      </button>
    );
  };

  return (
    <div className="storyStatsModal" role="dialog" aria-modal="true" aria-label="Story statistics">
      <div className="storyStatsModal__dots" aria-hidden="true" />
      <header className="storyStatsModal__header">
        <span className="storyStatsModal__brand">ME YOU</span>
        <button type="button" className="storyStatsModal__close" onClick={onClose} aria-label="Закрыть">
          <LuX aria-hidden="true" />
        </button>
      </header>

      <div className="storyStatsModal__rail" aria-label="Stories">
        {safeStories.map((_, index) => renderStoryThumb(index))}
        <button type="button" className="storyStatsModal__add" onClick={onAddStory}>
          <img src={profileIcons.storyAdd} alt="" aria-hidden="true" />
          <span>Добавить</span>
        </button>
      </div>

      <div className="storyStatsModal__tabs" role="tablist" aria-label="Story statistics tabs">
        <button
          type="button"
          className={activeTab === "views" ? "is-active" : ""}
          onClick={() => onTabChange("views")}
          role="tab"
          aria-selected={activeTab === "views"}
        >
          <img src={profileIcons.storyViews} alt="" aria-hidden="true" />
          Просмотры
        </button>
        <button
          type="button"
          className={activeTab === "stats" ? "is-active" : ""}
          onClick={() => onTabChange("stats")}
          role="tab"
          aria-selected={activeTab === "stats"}
        >
          <img src={profileIcons.storyAnalytics} alt="" aria-hidden="true" />
          Статистика
        </button>
      </div>

      {activeTab === "views" ? (
        <section className="storyStatsModal__views">
          <div className="storyStatsModal__viewsHead">
            <h3>Просмотрели: <b>{viewsCount}</b></h3>
            <button type="button" onClick={onRefresh} disabled={analyticsLoading}>
              <LuRefreshCw aria-hidden="true" />
              Обновить
            </button>
          </div>

          {analyticsLoading ? (
            <p className="storyStatsModal__hint">Загрузка...</p>
          ) : (
            <div className="storyStatsModal__viewerList">
              {viewers.map((viewer, index) => {
                const reactionsList = normalizeReactionList(viewer.reactions);

                return (
                  <button
                    type="button"
                    key={viewer.id || index}
                    className="storyStatsModal__viewer"
                    onClick={() => onSelectViewer(viewer)}
                  >
                    <img src={viewer.avatarUrl || profileIcons.userStory} alt="" />
                    <span className="storyStatsModal__viewerName">{getUserDisplayName(viewer)}</span>
                    {viewer.isFollower ? <span className="storyStatsModal__online" aria-label="Подписчик" /> : null}
                    <span className="storyStatsModal__viewerReactions" aria-hidden="true">
                      {reactionsList.slice(0, 3).map((type, reactionIndex) => (
                        <span key={`${type}-${reactionIndex}`}>{getReactionGlyph(type)}</span>
                      ))}
                    </span>
                  </button>
                );
              })}
              {viewers.length === 0 ? <p className="storyStatsModal__hint">Пока нет просмотров</p> : null}
            </div>
          )}
        </section>
      ) : (
        <section className="storyStatsModal__summary">
          <div className="storyStatsModal__summaryRow">
            <span>Просмотрели:</span>
            <strong>{viewsCount}</strong>
            <small>Все пользователи</small>
          </div>
          <div className="storyStatsModal__summaryRow">
            <span>Поделились:</span>
            <strong>{sharesCount}</strong>
            <small>Все пользователи</small>
          </div>
          <div className="storyStatsModal__summaryRow">
            <span>Реакции:</span>
            <strong>{reactionsCount}</strong>
            <small>Все пользователи</small>
          </div>
          {Object.entries(reactions).length > 0 ? (
            <div className="storyStatsModal__reactionBreakdown">
              {Object.entries(reactions).map(([type, count]) => (
                <span key={type}>{getReactionGlyph(type)} {count}</span>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function StoryStatsUserSheet({ user, onClose, onMessage, onProfile }) {
  if (!user) return null;

  const name = getUserDisplayName(user);

  return (
    <>
      <button
        type="button"
        className="storyStatsUserSheet__backdrop"
        onClick={onClose}
        aria-label="Закрыть действия пользователя"
      />
      <div className="storyStatsUserSheet" role="dialog" aria-modal="true" aria-label={name}>
        <div className="storyStatsUserSheet__person">
          <img src={user.avatarUrl || profileIcons.userStory} alt="" />
          <div>
            <strong>{name}</strong>
            <span>{user.isFollower ? "Ваш подписчик" : user.username ? `@${user.username}` : "Пользователь"}</span>
          </div>
        </div>

        <button type="button" onClick={onMessage}>
          <LuMessageCircle aria-hidden="true" />
          Написать сообщение {name}
        </button>
        <button type="button" onClick={onProfile}>
          <LuUsers aria-hidden="true" />
          Посмотреть профиль
        </button>
        <button type="button">
          <LuFlag aria-hidden="true" />
          Пожаловаться
        </button>
        <button type="button">
          <LuBan aria-hidden="true" />
          Заблокировать
        </button>
      </div>
    </>
  );
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
  onReactionChange,
}) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [mediaOrientation, setMediaOrientation] = useState("unknown");
  const [storyViews, setStoryViews] = useState([]);
  const [storyViewsLoading, setStoryViewsLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [isReactionSaving, setIsReactionSaving] = useState(false);
  const [isReplySending, setIsReplySending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState("views");
  const [selectedStatsUser, setSelectedStatsUser] = useState(null);
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);

  const navigate = useNavigate();

  const videoRef = useRef(null);
  const viewedRef = useRef(new Set());
  const onCloseRef = useRef(onClose);
  const onViewedRef = useRef(onViewed);
  const onReactionChangeRef = useRef(onReactionChange);
  const groupIndexRef = useRef(groupIndex);
  const storyIndexRef = useRef(storyIndex);
  const progressStartedRef = useRef(false);
  const wasOpenRef = useRef(false);
  const pendingCloseRef = useRef(false);

  onCloseRef.current = onClose;
  onViewedRef.current = onViewed;
  onReactionChangeRef.current = onReactionChange;
  groupIndexRef.current = groupIndex;
  storyIndexRef.current = storyIndex;

  const scheduleAfterRender = useCallback((callback) => {
    window.queueMicrotask(() => {
      callback?.();
    });
  }, []);

  const requestClose = useCallback(() => {
    if (pendingCloseRef.current) return;
    pendingCloseRef.current = true;
    scheduleAfterRender(() => {
      pendingCloseRef.current = false;
      onCloseRef.current?.();
    });
  }, [scheduleAfterRender]);

  const safeGroups = Array.isArray(groups) ? groups : [];

  const currentGroup = safeGroups[groupIndex];
  const stories = Array.isArray(currentGroup?.stories) ? currentGroup.stories : [];
  const currentStory = stories[storyIndex];

  const storyId = getStoryId(currentStory);
  const currentStoryReaction =
    currentStory?.myReaction ??
    currentStory?.reactionByMe ??
    currentStory?.viewerReaction ??
    null;
  const mediaUrl = getStoryMediaUrl(currentStory);
  const mediaType = getStoryMediaType(currentStory);
  const author = currentGroup?.author || currentStory?.author;
  const authorAvatar = author?.avatarUrl || author?.avatar || profileIcons.userStory;
  const isOwnStory =
    String(author?.id ?? currentStory?.authorId ?? "") === String(currentUserId ?? "");
  const authorId = author?.id ?? currentStory?.authorId ?? currentStory?.userId;
  const isStoryPaused = analyticsOpen || Boolean(selectedStatsUser);

  const handleOpenAuthorProfile = () => {
    const username = author?.username || author?.nick || author?.nickname;

    if (!username) return;

    requestClose();
    scheduleAfterRender(() => onOpenProfile?.(username));
  };

  const handleSaveStoryMedia = async () => {
    if (!mediaUrl) return;

    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();

      const extension =
        mediaType === "video"
          ? "mp4"
          : blob.type?.split("/")?.[1] || "jpg";

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = `meyou-story-${storyId || Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Save story media failed", error);

      window.open(mediaUrl, "_blank", "noopener,noreferrer");
    }
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
    progressStartedRef.current = false;

    const currentGroupIndex = groupIndexRef.current;
    const currentStoryIndex = storyIndexRef.current;
    const currentStories = Array.isArray(safeGroups[currentGroupIndex]?.stories)
      ? safeGroups[currentGroupIndex].stories
      : [];

    if (currentStoryIndex < currentStories.length - 1) {
      setStoryIndex(currentStoryIndex + 1);
      return;
    }

    if (currentGroupIndex < safeGroups.length - 1) {
      setGroupIndex(currentGroupIndex + 1);
      setStoryIndex(0);
      return;
    }

    requestClose();
  }, [safeGroups, requestClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setDuration(DEFAULT_DURATION);
    progressStartedRef.current = false;

    const currentGroupIndex = groupIndexRef.current;
    const currentStoryIndex = storyIndexRef.current;

    if (currentStoryIndex > 0) {
      setStoryIndex(currentStoryIndex - 1);
      return;
    }

    if (currentGroupIndex > 0) {
      const prevGroup = safeGroups[currentGroupIndex - 1];
      const prevStories = Array.isArray(prevGroup?.stories) ? prevGroup.stories : [];
      setGroupIndex(currentGroupIndex - 1);
      setStoryIndex(Math.max(prevStories.length - 1, 0));
    }
  }, [safeGroups]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setGroupIndex(initialGroupIndex || 0);
      setStoryIndex(initialStoryIndex || 0);
      setProgress(0);
      setDuration(DEFAULT_DURATION);
      progressStartedRef.current = false;
      pendingCloseRef.current = false;
    }

    if (!isOpen && wasOpenRef.current) {
      setProgress(0);
      setDuration(DEFAULT_DURATION);
      progressStartedRef.current = false;
      pendingCloseRef.current = false;
    }

    wasOpenRef.current = isOpen;
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
    if (!isOpen) return;

    const handleCloseStoryOverlays = () => {
      requestClose();
    };

    window.addEventListener(
      "closeStoryOverlays",
      handleCloseStoryOverlays
    );

    return () => {
      window.removeEventListener(
        "closeStoryOverlays",
        handleCloseStoryOverlays
      );
    };
  }, [isOpen, requestClose]);

  useEffect(() => {
    if (!isOpen || !storyId || viewedRef.current.has(storyId)) return;

    // Свои stories не отмечаем как просмотренные
    if (isOwnStory) return;

    viewedRef.current.add(storyId);

    storiesApi.markViewed(storyId)
      .then(() => {
        scheduleAfterRender(() => onViewedRef.current?.(storyId));
      })
      .catch((e) => {
        console.error("[story-view] failed", e);
      });
  }, [isOpen, storyId, isOwnStory, scheduleAfterRender]);

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
    if (!isOpen || !hasStories || isStoryPaused) return undefined;

    const stepMs = 50;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + (stepMs / duration) * 100;
        if (next > 0 && next < 100) {
          progressStartedRef.current = true;
        }
        return Math.min(next, 100);
      });
    }, stepMs);

    return () => window.clearInterval(interval);
  }, [isOpen, hasStories, duration, storyId, isStoryPaused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaType !== "video") return;

    if (isStoryPaused) {
      video.pause();
      return;
    }

    video.play?.().catch(() => {});
  }, [isStoryPaused, mediaType, storyId]);

  useEffect(() => {
    if (!isOpen || !hasStories || progress < 100) return undefined;
    if (!progressStartedRef.current) return undefined;

    const timer = window.setTimeout(() => {
      progressStartedRef.current = false;
      goNext();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [progress, isOpen, hasStories, goNext]);

  useEffect(() => {
    if (!isOpen || !storyId) return;
    progressStartedRef.current = false;
    setProgress(0);
    setDuration(DEFAULT_DURATION);
  }, [isOpen, storyId]);

  useEffect(() => {
    if (!isOpen || !storyId) return;

    setSelectedReaction(currentStoryReaction);
    setAnalytics(null);
    setAnalyticsTab("views");
    setSelectedStatsUser(null);
  }, [isOpen, storyId, currentStoryReaction]);

  const loadAnalytics = useCallback(async () => {
    if (!storyId || !isOwnStory) return;

    try {
      setAnalyticsLoading(true);
      const response = await storiesApi.getAnalytics(storyId);
      setAnalytics(response?.data || response || {});
    } catch (error) {
      console.error("[story-analytics] failed", error);
      toast.error("Не удалось загрузить аналитику story");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isOwnStory, storyId]);

  useEffect(() => {
    if (!analyticsOpen || !storyId || !isOwnStory) return;
    loadAnalytics();
  }, [analyticsOpen, storyId, isOwnStory, loadAnalytics]);

  const handleOpenAnalytics = async () => {
    if (!storyId || !isOwnStory) return;

    setAnalyticsOpen(true);
    setAnalyticsTab("views");
    setSelectedStatsUser(null);
    loadAnalytics();
  };

  const handleSelectStatsStory = (nextStoryIndex) => {
    if (nextStoryIndex === storyIndex) return;

    setStoryIndex(nextStoryIndex);
    setProgress(0);
    setDuration(DEFAULT_DURATION);
    setAnalytics(null);
    setAnalyticsTab("views");
    setSelectedStatsUser(null);
    progressStartedRef.current = false;
  };

  const handleOpenStoryUpload = () => {
    setSelectedStatsUser(null);
    setIsStoryUploadOpen(true);
  };

  const handleStatsUserMessage = async () => {
    const participantId = selectedStatsUser?.id;
    if (!participantId) return;

    try {
      const conversation = await conversationsApi.create(participantId);
      setSelectedStatsUser(null);
      setAnalyticsOpen(false);
      requestClose();

      if (conversation?.id) {
        scheduleAfterRender(() => navigate(`/messages/${conversation.id}`));
      }
    } catch (error) {
      console.error("[story-stats-message] failed", error);
      toast.error("Не удалось открыть чат");
    }
  };

  const handleStatsUserProfile = () => {
    const handle = selectedStatsUser?.username || selectedStatsUser?.id;
    setSelectedStatsUser(null);
    setAnalyticsOpen(false);

    if (handle) {
      requestClose();
      scheduleAfterRender(() => onOpenProfile?.(handle));
    }
  };

  const handleReactionClick = async (reactionType) => {
    if (!storyId || isOwnStory || isReactionSaving) return;

    const previousReaction = selectedReaction;
    const nextReaction = previousReaction === reactionType ? null : reactionType;

    try {
      setIsReactionSaving(true);

      setSelectedReaction(nextReaction);
      scheduleAfterRender(() =>
        onReactionChangeRef.current?.(storyId, nextReaction),
      );

      if (!nextReaction) {
        await storiesApi.deleteReaction(storyId);
        return;
      }

      await storiesApi.setReaction(storyId, nextReaction);
    } catch (error) {
      console.error("[story-reaction] failed", error);

      setSelectedReaction(previousReaction);
      scheduleAfterRender(() =>
        onReactionChangeRef.current?.(storyId, previousReaction),
      );
    } finally {
      setIsReactionSaving(false);
    }
  };

  const handleSendStoryReply = async () => {
    const message = replyText.trim();

    if (!storyId || isOwnStory || !message || isReplySending) return;

    try {
      setIsReplySending(true);

      const response = await storiesApi.reply(storyId, message);

      setReplyText("");

      toast.success("Ответ отправлен");
    } catch (error) {
      toast.error("Не удалось отправить ответ");
      console.error("[story-reply] failed", error);
    } finally {
      setIsReplySending(false);
    }
  };

  const handleVisitorMenuAction = async (action) => {
    if (!storyId || isOwnStory) return;

    try {
      if (action === "mute") {
        if (!authorId) return;
        await storiesApi.muteAuthor(authorId);
        toast.success("Stories автора скрыты");
        setIsMenuOpen(false);
        requestClose();
        return;
      }

      if (action === "interesting") {
        await storiesApi.markInteresting(storyId);
        toast.success("Спасибо за отметку");
      }

      if (action === "not-interesting") {
        await storiesApi.markNotInteresting(storyId);
        toast.success("Будем показывать меньше похожих stories");
      }

      if (action === "report") {
        const reason = window.prompt("Причина жалобы");
        if (!reason?.trim()) return;
        await storiesApi.reportStory(storyId, reason.trim());
        toast.success("Жалоба отправлена");
      }

      setIsMenuOpen(false);
    } catch (error) {
      console.error("[story-menu-action] failed", error);
      toast.error("Не удалось выполнить действие");
    }
  };

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
          requestClose();
          navigate("/profile");
        }}
        onGoExplore={() => {
          requestClose();
          navigate("/search");
        }}
        onGoWallet={() => {
          requestClose();
          navigate("/wallet");
        }}
        onGoVipChat={() => {
          requestClose();
          navigate("/vip-chat");
        }}
        onGoHome={() => {
          requestClose();
          navigate("/first-page");
        }}
      />

      <div className="storyViewer__page">
        <div className="storyViewer__bgDots" aria-hidden="true" />

        <div
          className={`storyViewer__card ${isOwnStory ? "storyViewer__card--own" : "storyViewer__card--visitor"
            }`}
        >
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

          {!isOwnStory && (
            <button type="button" className="storyViewer__followBtn">
              Подписаться
            </button>
          )}

          <button
            type="button"
            className="storyViewer__menu"
            aria-label="Більше"
            onClick={() => setIsMenuOpen(prev => !prev)}
          >
            ⋮
          </button>

          {isMenuOpen && !isOwnStory && (
            <>
              <div
                className="storyViewer__menuOverlay"
                onClick={() => setIsMenuOpen(false)}
              />

              <div className="storyViewer__popup">
                <button type="button" onClick={() => handleVisitorMenuAction("mute")}>
                  Скрыть истории автора
                </button>
                <button type="button" onClick={() => handleVisitorMenuAction("interesting")}>
                  Интересно
                </button>
                <button type="button" onClick={() => handleVisitorMenuAction("not-interesting")}>
                  Не интересно
                </button>
                <button type="button" onClick={() => handleVisitorMenuAction("report")}>
                  Пожаловаться
                </button>
              </div>
            </>
          )}

          {isMenuOpen && isOwnStory && (
            <>
              <div
                className="storyViewer__menuOverlay"
                onClick={() => setIsMenuOpen(false)}
              />

              <div
                className="storyViewer__popup storyViewer__popup--own"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="storyViewer__popupDanger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    handleSaveStoryMedia();
                    setIsMenuOpen(false);
                  }}
                >
                  Сохранить фото/видео
                </button>

                {/* <button type="button">
                  Изменить настройки конфиденциальности
                </button> */}

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    setIsMenuOpen(false);
                    onDeleteStory?.(storyId);
                  }}
                >
                  Удалить
                </button>
              </div>
            </>
          )}

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
                ref={videoRef}
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
                    setDuration(Math.min(Math.max(seconds * 1000, 3000), 60000));
                  }
                }}
                onEnded={() => {
                  if (!isStoryPaused) goNext();
                }}
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
          <>
            <div className="storyViewer__actions">
              <button type="button" className="storyViewer__action" onClick={handleOpenAnalytics}>
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

              <div className="storyViewer__actionsCenter">
                <button type="button" className="storyViewer__action">
                  <img
                    src={profileIcons.storyForward}
                    alt=""
                    className="storyViewer__actionImg"
                  />
                  <span>Поделиться</span>
                </button>

                <button type="button" className="storyViewer__action">
                  <span className="storyViewer__actionIcon">@</span>
                  <span>Отметить</span>
                </button>
              </div>

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
            {analyticsOpen ? (
              <StoryAnalyticsModal
                analytics={analytics}
                analyticsLoading={analyticsLoading}
                currentStory={currentStory}
                stories={stories}
                storyIndex={storyIndex}
                storyViewersOnly={storyViewersOnly}
                activeTab={analyticsTab}
                onTabChange={setAnalyticsTab}
                onRefresh={loadAnalytics}
                onAddStory={handleOpenStoryUpload}
                onSelectStory={handleSelectStatsStory}
                onSelectViewer={setSelectedStatsUser}
                onClose={() => {
                  setSelectedStatsUser(null);
                  setAnalyticsOpen(false);
                }}
              />
            ) : null}
            <StoryStatsUserSheet
              user={selectedStatsUser}
              onClose={() => setSelectedStatsUser(null)}
              onMessage={handleStatsUserMessage}
              onProfile={handleStatsUserProfile}
            />
          </>
        ) : (
          <div className="storyViewer__viewerReplyBar">
            <div className="storyViewer__messageWrap">
              <input
                type="text"
                className="storyViewer__messageInput"
                placeholder="Отправить сообщение"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendStoryReply();
                  }
                }}
              />

              <button
                type="button"
                className="storyViewer__sendBtn"
                onClick={handleSendStoryReply}
                disabled={isReplySending || !replyText.trim()}
              >
                <img src={profileIcons.storyForward} alt="" />
              </button>
            </div>

            <div className="storyViewer__reactions">
              {storyReactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  className={`storyViewer__reactionBtn ${selectedReaction === reaction.id ? "storyViewer__reactionBtn--active" : ""
                    }`}
                  onClick={() => handleReactionClick(reaction.id)} disabled={isReactionSaving}
                >
                  <img src={reaction.icon} alt="" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <StoryUploadModal
        isOpen={isStoryUploadOpen}
        onClose={() => setIsStoryUploadOpen(false)}
        onCreated={() => {
          setIsStoryUploadOpen(false);
        }}
      />
    </div>
  );
}
