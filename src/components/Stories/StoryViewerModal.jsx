import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LuRefreshCw,
  LuX,
} from "react-icons/lu";
import { storiesApi } from "../../services/storiesApi";
import { conversationsApi } from "../../services/conversationsApi";
import { usersApi } from "../../services/usersApi";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { storyReactions } from "../../constants/storyReactions";
import profileIcons from "../../constants/profileIcons";
import {
  extractFollowingFromResponse,
  extractUsersFromSearchResponse,
  recipientDisplayName,
} from "../../utils/shareRecipients";
import AppHeader from "../Layout/AppHeader";
import "./StoryViewerModal.scss";
import StoryUploadModal from "./StoryUploadModal";

const DEFAULT_DURATION = 10000;
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
    id: user.id || user._id || item?.userId || item?.viewerId,
    username: user.username || user.nick || user.nickname || "",
    firstName: user.firstName,
    lastName: user.lastName,
    displayName:
      user.displayName ||
      (user.name && user.name !== user.username ? user.name : ""),
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
      item?.reactionType ||
      item?.reaction?.type ||
      item?.reaction?.reactionType ||
      item?.reaction ||
      item?.viewerReaction ||
      item?.viewerReaction?.type ||
      item?.viewerReaction?.reactionType ||
      item?.storyReaction ||
      item?.storyReaction?.type ||
      item?.storyReaction?.reactionType ||
      item?.type ||
      user?.reactions ||
      user?.reactionType ||
      user?.reaction?.type ||
      user?.reaction ||
      user?.viewerReaction ||
      user?.viewerReaction?.type ||
      [],
    reactionsCount:
      item?.reactionsCount ??
      item?.reactionCount ??
      user?.reactionsCount ??
      user?.reactionCount ??
      0,
  };
}

function getUserDisplayName(user) {
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.displayName ||
    user?.name ||
    user?.username ||
    "User"
  );
}

function normalizeReactionList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function getReactionIcon(type) {
  const normalized = String(type || "").toUpperCase();

  return storyReactions.find(
    (reaction) => String(reaction.id).toUpperCase() === normalized
  )?.icon;
}

function getReactionUserId(item) {
  return (
    item?.user?.id ||
    item?.user?._id ||
    item?.viewer?.id ||
    item?.viewer?._id ||
    item?.userId ||
    item?.viewerId ||
    item?.authorId ||
    item?.id ||
    item?._id ||
    null
  );
}

function getReactionType(item, fallbackType) {
  return (
    item?.type ||
    item?.reactionType ||
    item?.reaction?.type ||
    item?.reaction?.reactionType ||
    item?.reaction?.emoji ||
    item?.viewerReaction?.type ||
    item?.viewerReaction?.reactionType ||
    item?.storyReaction?.type ||
    item?.storyReaction?.reactionType ||
    item?.reaction ||
    item?.emoji ||
    item?.name ||
    fallbackType ||
    null
  );
}

function buildStoryReactionsByUser(analytics) {
  const result = new Map();
  const addReaction = (userId, reactionType) => {
    if (!userId || !reactionType) return;

    const key = String(userId);
    const previous = result.get(key) || [];
    result.set(key, [...previous, reactionType]);
  };

  [
    analytics?.reactions,
    analytics?.reactionsPreview,
    analytics?.reactionList,
    analytics?.reactionsList,
    analytics?.viewerReactions,
    analytics?.viewersReactions,
    analytics?.reactionsByViewer,
    analytics?.reactionsByUser,
  ].filter(Array.isArray).forEach((list) => {
    list.forEach((item) => addReaction(getReactionUserId(item), getReactionType(item)));
  });

  [
    analytics?.viewerReactions,
    analytics?.viewersReactions,
    analytics?.reactionsByViewer,
    analytics?.reactionsByUser,
  ].filter((value) => value && !Array.isArray(value) && typeof value === "object").forEach((map) => {
    Object.entries(map).forEach(([userId, value]) => {
      normalizeReactionList(value).forEach((reaction) => {
        addReaction(userId, getReactionType(reaction, reaction));
      });
    });
  });

  const grouped = analytics?.reactionsByType || analytics?.reactionsGrouped || {};
  Object.entries(grouped).forEach(([type, value]) => {
    const groupedItems = Array.isArray(value)
      ? value
      : [
        value?.users,
        value?.viewers,
        value?.items,
        value?.data,
        value?.reactions,
      ].find(Array.isArray) || [];

    groupedItems.forEach((item) => addReaction(getReactionUserId(item), getReactionType(item, type)));
  });

  return result;
}

function getStoryViewsCount(story, views = []) {
  const listedViewsCount = Array.isArray(views) ? views.length : 0;
  const rawCount =
    story?.viewsCount ??
    story?.viewCount ??
    story?.views_count ??
    story?.countViews ??
    story?.analytics?.viewsCount ??
    story?.stats?.viewsCount ??
    0;
  const numericCount = Number(rawCount);

  return Math.max(Number.isFinite(numericCount) ? numericCount : 0, listedViewsCount);
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

function extractStoryReactionsList(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.reactions)) return response.reactions;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.reactions)) return response.data.reactions;
  return [];
}

function extractStoryViewsCount(response, views = []) {
  const rawCount =
    response?.viewsCount ??
    response?.viewCount ??
    response?.count ??
    response?.total ??
    response?.meta?.total ??
    response?.data?.viewsCount ??
    response?.data?.viewCount ??
    response?.data?.count ??
    response?.data?.total;
  const numericCount = Number(rawCount);

  return Math.max(
    Number.isFinite(numericCount) ? numericCount : 0,
    Array.isArray(views) ? views.length : 0,
  );
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
  const reactionsByUser = useMemo(() => buildStoryReactionsByUser(analytics), [analytics]);
  const viewers = [...rawViewers, ...storyViewersOnly]
    .map(normalizeStoryViewUser)
    .filter(Boolean)
    .reduce((acc, viewer) => {
      const key = String(viewer.id || viewer.username || acc.length);
      const previous = acc.byKey.get(key);
      const previousReactions = normalizeReactionList(previous?.reactions);
      const ownReactions = normalizeReactionList(viewer.reactions);
      const merged = {
        ...previous,
        ...viewer,
        reactions: ownReactions.length > 0 ? ownReactions : previousReactions,
        reactionsCount: Math.max(
          Number(previous?.reactionsCount || 0),
          Number(viewer.reactionsCount || 0),
        ),
      };

      acc.byKey.set(key, merged);
      return acc;
    }, { byKey: new Map() });
  const viewersList = [...viewers.byKey.values()].map((viewer) => {
    const analyticsReactions = reactionsByUser.get(String(viewer.id)) || [];

    return {
      ...viewer,
      reactions: normalizeReactionList(viewer.reactions).length > 0
        ? normalizeReactionList(viewer.reactions)
        : analyticsReactions,
    };
  });
  const viewsCount = Math.max(
    Number(analytics?.viewsCount ?? 0),
    getStoryViewsCount(currentStory, storyViewersOnly),
  );
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
              {viewersList.map((viewer, index) => {
                const reactionsList = normalizeReactionList(viewer.reactions);
                const visibleReactions = reactionsList.length > 0
                  ? reactionsList
                  : Number(viewer.reactionsCount || 0) > 0
                    ? ["heart"]
                    : [];

                console.log({
                  viewer: getUserDisplayName(viewer),
                  viewerReactions: viewer.reactions,
                  analyticsReactions: reactionsByUser.get(String(viewer.id)),
                  visibleReactions,
                });

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
                    <div className="storyStatsModal__viewerReactions" aria-hidden="true">
                      {visibleReactions.slice(0, 3).map((type, reactionIndex) => {
                        const icon = getReactionIcon(type);

                        if (!icon) return null;

                        return (
                          <span
                            key={`${type}-${reactionIndex}`}
                            className="storyStatsModal__viewerReaction"
                          >
                            <img
                              src={icon}
                              alt=""
                              className="storyStatsModal__viewerReactionIcon"
                            />
                          </span>
                        );
                      })}
                    </div>         </button>
                );
              })}
              {viewersList.length === 0 ? <p className="storyStatsModal__hint">Пока нет просмотров</p> : null}
            </div>
          )}
        </section>
      ) : (
        <section className="storyStatsModal__summary">
          <div className="storyStatsModal__summaryRow">
            <span>Просмотрели:</span>
            <div className="storyStatsModal__summaryWrap">
              <strong>{viewsCount}</strong>
              {/* <small>Все пользователи</small> */}
            </div>
          </div>
          <div className="storyStatsModal__summaryRow">
            <span>Поделились:</span>
            <div className="storyStatsModal__summaryWrap">
              <strong>{sharesCount}</strong>
              {/* <small>Все пользователи</small> */}
            </div>
          </div>
          <div className="storyStatsModal__summaryRow">
            <span>Реакции:</span>
            <div className="storyStatsModal__summaryWrap">
              <strong>{reactionsCount}</strong>
              {/* <small>Все пользователи</small> */}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StoryStatsUserSheet({ user,
  onClose,
  onMessage,
  onProfile,
  onReport,
  onBlock,
  onUnblock,
  isBlocked, }) {
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
          <img src={profileIcons.storyChat} alt="" />
          Написать сообщение {name}
        </button>
        <button type="button" onClick={onProfile}>
          <img src={profileIcons.storyViewerProfile} alt="" />
          Посмотреть профиль
        </button>
        <button type="button" onClick={onReport}>
          <img src={profileIcons.complainBlack} alt="" />
          Пожаловаться
        </button>
        {isBlocked ? (
          <button type="button" onClick={onUnblock}>
            <img src={profileIcons.storyBlock} alt="" />
            Разблокировать
          </button>
        ) : (
          <button type="button" onClick={onBlock}>
            <img src={profileIcons.storyBlock} alt="" />
            Заблокировать
          </button>
        )}
      </div>
    </>
  );
}

function StoryShareModal({ isOpen, story, onClose }) {
  const storyId = getStoryId(story);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(() => new Map());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelected(new Map());
      setMessage("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    subscriptionsApi.getFollowing({ take: 50 })
      .then((res) => {
        if (!cancelled) setSuggestions(extractFollowingFromResponse(res));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      usersApi.search({ q: trimmed })
        .then((res) => {
          if (!cancelled) setResults(extractUsersFromSearchResponse(res));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

  if (!isOpen || !storyId) return null;

  const visibleUsers = query.trim() ? results : suggestions;
  const selectedUsers = [...selected.values()];
  const mediaUrl = getStoryMediaUrl(story);
  const mediaType = getStoryMediaType(story);
  const storyText = story?.text || "";

  const toggleUser = (user) => {
    if (!user?.id) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0 || sending) return;

    try {
      setSending(true);
      await Promise.all(selectedUsers.map(async (user) => {
        const conversation = await conversationsApi.create(user.id);
        const conversationId = conversation?.id || conversation?._id;
        if (!conversationId) return;

        await conversationsApi.sendMessage(conversationId, {
          storyId,
          mediaUrl,
          mediaType,
          text: message.trim() || storyText || "Story",
          metadata: {
            storyPreview: {
              storyId,
              mediaUrl,
              mediaType,
              text: storyText,
            },
          },
        });
      }));
      toast.success("Story отправлена");
      onClose?.();
    } catch (error) {
      console.error("[story-share] failed", error);
      toast.error("Не удалось отправить story");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="storyShareModal" role="presentation" onClick={onClose}>
      <div className="storyShareModal__dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="storyShareModal__header">
          <strong>Поделиться story</strong>
          <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
        </header>
        <input
          type="search"
          className="storyShareModal__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск"
        />
        <div className="storyShareModal__list">
          {loading ? <p>Загрузка...</p> : null}
          {!loading && visibleUsers.length === 0 ? <p>Нет пользователей</p> : null}
          {visibleUsers.map((user) => {
            const isSelected = selected.has(user.id);
            return (
              <button
                type="button"
                key={user.id}
                className={`storyShareModal__user ${isSelected ? "is-selected" : ""}`}
                onClick={() => toggleUser(user)}
              >
                <img src={user.avatarUrl || user.avatar || profileIcons.userStory} alt="" />
                <span>{recipientDisplayName(user)}</span>
                <b>{isSelected ? "✓" : ""}</b>
              </button>
            );
          })}
        </div>
        <textarea
          className="storyShareModal__message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Сообщение"
        />
        <button
          type="button"
          className="storyShareModal__send"
          disabled={selectedUsers.length === 0 || sending}
          onClick={handleSend}
        >
          {sending ? "Отправка..." : "Отправить"}
        </button>
      </div>
    </div>
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
  onBlockedAuthor,
}) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [mediaOrientation, setMediaOrientation] = useState("unknown");
  const [storyViews, setStoryViews] = useState([]);
  const [storyViewsCount, setStoryViewsCount] = useState(null);
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
  const [isStoryShareOpen, setIsStoryShareOpen] = useState(false);
  const [blockConfirmUser, setBlockConfirmUser] = useState(null);
  const [blockedUserIds, setBlockedUserIds] = useState(() => new Set());

  const isUserBlocked = (userId) =>
    blockedUserIds.has(String(userId ?? ""));

  const navigate = useNavigate();
  const location = useLocation();

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
  const locationPathRef = useRef(null);

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

  const closeStoryOverlays = useCallback(() => {
    setAnalyticsOpen(false);
    setSelectedStatsUser(null);
    setIsStoryUploadOpen(false);
    setIsStoryShareOpen(false);
    setIsMenuOpen(false);
    requestClose();
  }, [requestClose]);

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
    if (!isOpen) {
      locationPathRef.current = location.pathname;
      return;
    }

    if (locationPathRef.current === null) {
      locationPathRef.current = location.pathname;
      return;
    }

    if (locationPathRef.current !== location.pathname) {
      locationPathRef.current = location.pathname;
      closeStoryOverlays();
    }
  }, [isOpen, location.pathname, closeStoryOverlays]);

  useEffect(() => {
    if (!isOpen) return;

    const handleCloseStoryOverlays = () => {
      closeStoryOverlays();
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
  }, [isOpen, closeStoryOverlays]);

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
        setStoryViewsCount(null);
        return;
      }

      const cached = storyViewsCache.get(storyId);

      if (cached) {
        const cachedViews = Array.isArray(cached) ? cached : cached.views;
        setStoryViews(Array.isArray(cachedViews) ? cachedViews : []);
        setStoryViewsCount(Array.isArray(cached) ? cached.length : cached.count);
        return;
      }

      if (storyViewsRequests.has(storyId)) {
        const cachedFromPending = await storyViewsRequests.get(storyId);

        if (!cancelled) {
          const pendingViews = Array.isArray(cachedFromPending)
            ? cachedFromPending
            : cachedFromPending?.views;
          setStoryViews(Array.isArray(pendingViews) ? pendingViews : []);
          setStoryViewsCount(Array.isArray(cachedFromPending) ? cachedFromPending.length : cachedFromPending?.count);
        }

        return;
      }

      try {
        setStoryViewsLoading(true);

        const request = storiesApi.getViews(storyId).then((response) => {
          const rawList = extractStoryViewsList(response);
          const views = rawList.map(normalizeStoryViewUser).filter(Boolean);
          return {
            views,
            count: extractStoryViewsCount(response, views),
          };
        });

        storyViewsRequests.set(storyId, request);

        const viewsPayload = await request;

        if (cancelled) return;

        storyViewsCache.set(storyId, viewsPayload);
        storyViewsRequests.delete(storyId);

        setStoryViews(viewsPayload.views);
        setStoryViewsCount(viewsPayload.count);
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

          const normalizedFallbackViews = fallbackViews.map(normalizeStoryViewUser).filter(Boolean);
          setStoryViews(normalizedFallbackViews);
          setStoryViewsCount(getStoryViewsCount(currentStory, normalizedFallbackViews));
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

    video.play?.().catch(() => { });
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
      const [analyticsResponse, reactionsResponse] = await Promise.all([
        storiesApi.getAnalytics(storyId),
        storiesApi.getReactions(storyId).catch(() => null),
      ]);

      const analyticsData = analyticsResponse?.data || analyticsResponse || {};
      const reactionsList = extractStoryReactionsList(reactionsResponse);

      setAnalytics({
        ...analyticsData,
        reactions: reactionsList,
      });
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

  useEffect(() => {
    if (!isOpen || !storyId || !isOwnStory || analyticsOpen) return;

    let cancelled = false;

    storiesApi.getAnalytics(storyId)
      .then((response) => {
        if (!cancelled) setAnalytics(response?.data || response || {});
      })
      .catch((error) => {
        console.error("[story-analytics-preview] failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, storyId, isOwnStory, analyticsOpen]);

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

  const handleStoryCreatedFromAnalytics = (createdStory) => {
    const story = createdStory?.data || createdStory?.story || createdStory;

    setIsStoryUploadOpen(false);

    if (!story) return;

    const nextStories = [...stories, story];
    const nextIndex = nextStories.length - 1;

    if (safeGroups[groupIndex]) {
      safeGroups[groupIndex].stories = nextStories;
    }

    setStoryIndex(nextIndex);
    setAnalytics(null);
    setAnalyticsTab("views");
    setSelectedStatsUser(null);
    setProgress(0);
    setDuration(DEFAULT_DURATION);
    progressStartedRef.current = false;
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
      scheduleAfterRender(() => {
        if (onOpenProfile) onOpenProfile(handle);
        else navigate(`/profile/${handle}`);
      });
    }
  };

  const handleStatsUserReport = () => {
    toast.info("Жалоба на пользователя пока недоступна на backend");
  };

  // const handleStatsUserReport = async () => {
  //   if (!storyId) return;

  //   const reason = window.prompt("Причина жалобы");

  //   if (!reason?.trim()) return;

  //   try {
  //     await storiesApi.reportStory(storyId, reason.trim());

  //     setSelectedStatsUser(null);
  //     toast.success("Жалобу отправлено");
  //   } catch (error) {
  //     console.error("[story-stats-report-story] failed", error?.response?.data || error);
  //     toast.error(error?.response?.data?.message || "Не удалось отправить жалобу");
  //   }
  // };



  const handleStatsUserBlock = async () => {
    const userId = selectedStatsUser?.id;
    if (!userId) return;

    setBlockConfirmUser({
      id: userId,
      name: getUserDisplayName(selectedStatsUser),
      source: "analytics",
    });
  };

  const handleStatsUserUnblock = async () => {
    const userId = selectedStatsUser?.id;
    if (!userId) return;

    try {
      await usersApi.unblockUser(userId);

      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });

      toast.success("Користувача розблоковано");
    } catch (error) {
      console.error("[story-unblock-user] failed", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Не вдалося розблокувати користувача");
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

  const handleConfirmBlockUser = async () => {
    const userId = blockConfirmUser?.id;

    if (!userId) return;

    try {
      await usersApi.blockUser(userId);

      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        next.add(String(userId));
        return next;
      });

      if (blockConfirmUser?.source === "analytics") {
        setBlockConfirmUser(null);
        toast.success("Користувача заблоковано");
        return;
      }

      toast.success("Користувача заблоковано");

      setBlockConfirmUser(null);
      setIsMenuOpen(false);
      setSelectedStatsUser(null);
      setAnalyticsOpen(false);

      onBlockedAuthor?.(userId);

      requestClose();
    } catch (error) {
      console.error("[story-block-user] failed", error);
      toast.error("Не вдалося заблокувати користувача");
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

        if (reason.trim().length < 3) {
          toast.error("Причина жалобы должна быть длиннее");
          return;
        }

        await storiesApi.reportStory(storyId, reason.trim());
        toast.success("Жалобу отправлено");
      }

      setIsMenuOpen(false);
    } catch (error) {
      console.error("[story-menu-action] failed", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Не удалось выполнить действие");
    }
  };

  const progressBars = useMemo(() => {
    return stories.map((story, index) => {
      if (index < storyIndex) return 100;
      if (index > storyIndex) return 0;
      return progress;
    });
  }, [stories, storyIndex, progress]);

  const currentStoryViewers = useMemo(() => {
    const candidates = [
      storyViews,
      analytics?.viewersPreview,
      analytics?.viewers,
      currentStory?.viewersPreview,
      currentStory?.viewers,
      currentStory?.views,
      currentStory?.viewedBy,
    ];

    return candidates
      .find((value) => Array.isArray(value) && value.length > 0)
      ?.map(normalizeStoryViewUser)
      .filter(Boolean) || [];
  }, [analytics, currentStory, storyViews]);

  const storyViewersOnly = currentStoryViewers.filter(
    (viewer) => String(viewer?.id ?? "") !== String(author?.id ?? "")
  );

  const viewsCount = Math.max(
    getStoryViewsCount(currentStory, storyViewersOnly),
    Number(storyViewsCount ?? 0),
    Number(analytics?.viewsCount ?? 0),
  );
  const visibleViewers = storyViewersOnly.length > 0
    ? storyViewersOnly.slice(0, 3)
    : viewsCount > 0
      ? Array.from({ length: Math.min(viewsCount, 3) }, (_, index) => ({
        id: `viewer-placeholder-${index}`,
        avatarUrl: profileIcons.userStory,
      }))
      : [];

  if (!isOpen || !hasStories) return null;

  return (
    <div className="storyViewer" role="dialog" aria-modal="true" aria-label="Перегляд story">
      <AppHeader
        onGoProfile={() => {
          closeStoryOverlays();
          navigate("/profile");
        }}
        onGoExplore={() => {
          closeStoryOverlays();
          navigate("/search");
        }}
        onGoWallet={() => {
          closeStoryOverlays();
          navigate("/wallet");
        }}
        onGoVipChat={() => {
          closeStoryOverlays();
          navigate("/vip-chat");
        }}
        onGoHome={() => {
          closeStoryOverlays();
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
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setBlockConfirmUser({
                      id: authorId,
                      name: getAuthorName(author),
                    });
                  }}
                >
                  Заблокировать
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
                <button type="button" className="storyViewer__action" onClick={() => setIsStoryShareOpen(true)}>
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
              onReport={handleStatsUserReport}
              onBlock={handleStatsUserBlock}
              onUnblock={handleStatsUserUnblock}
              isBlocked={isUserBlocked(selectedStatsUser?.id)}
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
        onCreated={handleStoryCreatedFromAnalytics}
      />
      <StoryShareModal
        isOpen={isStoryShareOpen}
        story={currentStory}
        onClose={() => setIsStoryShareOpen(false)}
      />

      {blockConfirmUser && (
        <div className="storyBlockConfirm" role="dialog" aria-modal="true">
          <div
            className="storyBlockConfirm__backdrop"
            onClick={() => setBlockConfirmUser(null)}
          />

          <div className="storyBlockConfirm__card">
            <p>Ви впевнені, що хочете заблокувати цього користувача?</p>

            <div className="storyBlockConfirm__actions">
              <button type="button" onClick={() => setBlockConfirmUser(null)}>
                Скасувати
              </button>

              <button
                type="button"
                className="storyBlockConfirm__danger"
                onClick={handleConfirmBlockUser}
              >
                Заблокувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
