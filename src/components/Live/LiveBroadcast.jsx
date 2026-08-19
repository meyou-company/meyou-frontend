import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useLocaleStore } from "../../zustand/useLocaleStore";
import { useLiveKitBroadcast } from "../../hooks/useLiveKitBroadcast";
import { extractLiveMedia, liveStreamsApi } from "../../services/liveStreamsApi";
import { getSessionAccessToken } from "../../services/api";
import { connectLiveSocket } from "../../services/liveSocket";
import { usersApi } from "../../services/usersApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getLiveErrorMessage } from "../../utils/getLiveErrorMessage";
import { emojiToReactionType as msgEmojiToReactionType } from "../../constants/messageReactions";

const LIVE_EMOJI_TO_REACTION_TYPE = {
  '❤️': 'HEART',
  '😁': 'SMILE',
  '😘': 'KISS',
  '😍': 'LOVE',
  '👀': 'EYES',
  '👏': 'WAVE',
  '🎁': 'GIFT',
  '🌹': 'ROSE',
};
function liveEmojiToReactionType(emoji) {
  return LIVE_EMOJI_TO_REACTION_TYPE[emoji] ?? msgEmojiToReactionType(emoji) ?? null;
}
import profileIcons from "../../constants/profileIcons";
import LiveHeader from "./LiveHeader";
import LiveStage from "./LiveStage";
import LiveChat from "./LiveChat";
import LiveUserPicker from "./LiveUserPicker";
import "./LiveBroadcast.scss";

const DEFAULT_AVATAR = "/Logo/photo.png";
const LIVE_STATUS = "LIVE";
const ENDED_STATUS = "ENDED";
const LIVE_HOST_MEDIA_PREFIX = "meyou_live_host_media:";
const LIVE_MESSAGES_CACHE_PREFIX = "meyou_live_messages:";
const COUNTER_SYNC_INTERVAL_MS = 2_000;
const MAX_CACHED_MESSAGES = 1_000;

function unwrap(value) {
  return value?.data && !Array.isArray(value.data) ? value.data : value;
}

function getDisplayName(user) {
  return (
    user?.name ||
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Пользователь"
  );
}

function getUserId(user) {
  return user?.id || user?._id || user?.userId || null;
}

function normalizeStream(payload) {
  const value = unwrap(payload) || {};
  const host = value.host || value.hostUser || value.author || value.user || value.owner || {};
  return {
    ...value,
    id: value.id || value._id,
    status: String(value.status || "SCHEDULED").toUpperCase(),
    host,
    hostId:
      value.hostId ||
      value.hostUserId ||
      value.ownerId ||
      value.authorId ||
      value.userId ||
      getUserId(host),
    startedAt: value.startedAt || value.started_at || null,
    endedAt: value.endedAt || value.ended_at || null,
    durationSec:
      value.durationSec ??
      value.durationSeconds ??
      value.duration_sec ??
      value.analytics?.durationSec ??
      null,
    isSoundEnabled: value.isSoundEnabled !== false,
    viewersCount:
      value.viewersCount ?? value.viewerCount ?? value.participantsCount ?? 0,
    reactionsCount: value.reactionsCount ?? value.likesCount ?? 0,
  };
}

function normalizeMessage(raw) {
  const value = unwrap(raw) || {};
  const author = value.author || value.user || value.sender || {};
  const id = value.id || value._id || value.messageId;
  return {
    id: id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    authorId: value.authorId || value.senderId || getUserId(author) || value.userId,
    authorName: value.authorName || getDisplayName(author),
    authorUsername:
      value.authorUsername ||
      value.username ||
      author.username ||
      author.nick ||
      author.nickname ||
      null,
    avatar:
      value.avatar || author.avatarUrl || author.avatar || author.photoUrl || DEFAULT_AVATAR,
    text: String(value.text || value.message || value.content || value.body || ""),
    createdAt:
      value.createdAt || value.created_at || value.sentAt || new Date().toISOString(),
    isPersisted: value.isPersisted ?? Boolean(id),
    isPinned: Boolean(value.isPinned ?? value.pinned),
    pinnedAt: value.pinnedAt || value.pinned_at || null,
  };
}

function appendUniqueMessage(list, message) {
  if (!message?.id || list.some((item) => item.id === message.id)) return list;
  return [...list, message];
}

function reconcileMessage(list, incoming) {
  if (!incoming?.id) return list;
  const existingIndex = list.findIndex((item) => String(item.id) === String(incoming.id));
  if (existingIndex !== -1) {
    const next = [...list];
    next[existingIndex] = { ...next[existingIndex], ...incoming };
    return next;
  }

  const incomingTime = Date.parse(incoming.createdAt) || Date.now();
  const pendingIndex = list.findIndex((item) => {
    if (item.isPersisted || item.text !== incoming.text) return false;
    const sameAuthor =
      !incoming.authorId ||
      !item.authorId ||
      String(item.authorId) === String(incoming.authorId);
    const itemTime = Date.parse(item.createdAt) || incomingTime;
    return sameAuthor && Math.abs(incomingTime - itemTime) < 30_000;
  });

  if (pendingIndex === -1) return appendUniqueMessage(list, incoming);

  const next = [...list];
  next[pendingIndex] = {
    ...incoming,
    isPinned: incoming.isPinned || next[pendingIndex].isPinned,
  };
  return next;
}

function mergeMessages(...collections) {
  return collections
    .flat()
    .map(normalizeMessage)
    .sort((a, b) => {
      const timeDifference = new Date(a.createdAt) - new Date(b.createdAt);
      const sameCandidate =
        a.text === b.text &&
        (!a.authorId || !b.authorId || String(a.authorId) === String(b.authorId)) &&
        Math.abs(timeDifference) < 30_000;
      if (sameCandidate && a.isPersisted !== b.isPersisted) {
        return a.isPersisted ? 1 : -1;
      }
      return timeDifference;
    })
    .reduce((list, message) => reconcileMessage(list, message), []);
}

function getLiveMessageEnvelope(payload) {
  const value = unwrap(payload) || {};
  if (value.message && typeof value.message === "object") return value.message;
  if (value.data?.message && typeof value.data.message === "object") {
    return value.data.message;
  }
  if (value.data && typeof value.data === "object") return value.data;
  return value;
}

function getPersistedSocketMessage(payload) {
  const value = getLiveMessageEnvelope(payload);
  const id = value?.id || value?._id || value?.messageId;
  if (!id) return null;
  return normalizeMessage(value);
}

function getLiveMessageStreamId(payload) {
  const value = unwrap(payload) || {};
  const message = getLiveMessageEnvelope(value);
  return (
    value.streamId ||
    value.liveStreamId ||
    value.stream?.id ||
    value.liveStream?.id ||
    message?.streamId ||
    message?.liveStreamId ||
    null
  );
}

function readHostMedia(streamId) {
  if (!streamId) return null;
  try {
    return JSON.parse(sessionStorage.getItem(`${LIVE_HOST_MEDIA_PREFIX}${streamId}`));
  } catch {
    return null;
  }
}

function cacheHostMedia(streamId, media) {
  if (!streamId || !media?.url || !media?.token) return;
  try {
    sessionStorage.setItem(`${LIVE_HOST_MEDIA_PREFIX}${streamId}`, JSON.stringify(media));
  } catch {
    // A fresh host token can still be requested from the start endpoint.
  }
}

function removeHostMedia(streamId) {
  if (!streamId) return;
  try {
    sessionStorage.removeItem(`${LIVE_HOST_MEDIA_PREFIX}${streamId}`);
  } catch {
    // Ignore unavailable storage.
  }
}

function readLiveCache(prefix, streamId, fallback = []) {
  if (!streamId) return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(`${prefix}${streamId}`));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeLiveCache(prefix, streamId, value) {
  if (!streamId) return;
  try {
    localStorage.setItem(`${prefix}${streamId}`, JSON.stringify(value));
  } catch {
    // The backend history remains available when browser storage is disabled.
  }
}

function formatCompactCount(value) {
  const number = Number(value) || 0;
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1).replace(".", ",")}K`;
  }
  return String(number);
}

function getStreamDurationSec(stream) {
  const explicitDuration = Number(stream?.durationSec);
  if (Number.isFinite(explicitDuration) && explicitDuration >= 0) {
    return Math.round(explicitDuration);
  }

  const startedAt = Date.parse(stream?.startedAt || "");
  const endedAt = Date.parse(stream?.endedAt || stream?.updatedAt || "");
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
    return 0;
  }
  return Math.round((endedAt - startedAt) / 1000);
}

function formatEndedDate(stream, locale) {
  const endedAt = new Date(stream?.endedAt || stream?.updatedAt || stream?.startedAt || "");
  if (Number.isNaN(endedAt.getTime())) return "";

  const now = new Date();
  const isToday =
    endedAt.getFullYear() === now.getFullYear() &&
    endedAt.getMonth() === now.getMonth() &&
    endedAt.getDate() === now.getDate();
  if (isToday) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: endedAt.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(endedAt);
}

function formatEndedPeriod(stream, locale) {
  const dateLabel = formatEndedDate(stream, locale);
  const capitalizedDate = dateLabel
    ? `${dateLabel.charAt(0).toLocaleUpperCase(locale)}${dateLabel.slice(1)}`
    : "";
  const startedAt = new Date(stream?.startedAt || "");
  const endedAt = new Date(stream?.endedAt || stream?.updatedAt || "");

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return capitalizedDate
      ? `${capitalizedDate} · трансляция окончена`
      : "Трансляция окончена";
  }

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${capitalizedDate} · ${timeFormatter.format(startedAt)}–${timeFormatter.format(endedAt)}`;
}

function formatDuration(durationSec) {
  const totalMinutes = Math.max(0, Math.round((Number(durationSec) || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
  if (hours > 0) return `${hours} ч`;
  return `${Math.max(1, minutes)} мин`;
}

function extractBlockedUserIds(payload) {
  const value = payload?.data ?? payload;
  const list = Array.isArray(value)
    ? value
    : value?.blockedUsers || value?.users || value?.items || value?.results || [];

  return (Array.isArray(list) ? list : [])
    .map((item) =>
      item?.blockedUserId ||
      item?.userId ||
      item?.blockedUser?.id ||
      item?.blocked?.id ||
      item?.user?.id ||
      item?.id ||
      item?._id
    )
    .filter(Boolean)
    .map(String);
}

export default function LiveBroadcast() {
  const navigate = useNavigate();
  const location = useLocation();
  const { liveId } = useParams();
  const authUser = useAuthStore((state) => state.user);
  const locale = useLocaleStore((state) => state.locale);
  const storeToken = useAuthStore((state) => state.token);
  const accessToken = storeToken || getSessionAccessToken();
  const chatRef = useRef(null);
  const streamRef = useRef(null);
  const hostReconnectRef = useRef(null);
  const viewerAutoConnectRef = useRef(null);
  const pinIntentRef = useRef(new Map());
  const pinMutationRef = useRef(new Map());
  const messageSyncInFlightRef = useRef(false);
  const counterSyncInFlightRef = useRef(false);

  const currentUser = useMemo(
    () => ({
      id: getUserId(authUser) || "current-user",
      username: authUser?.username || "",
      name: getDisplayName(authUser),
      avatar:
        authUser?.avatarUrl ||
        authUser?.avatar ||
        authUser?.photoUrl ||
        DEFAULT_AVATAR,
    }),
    [authUser],
  );

  const [stream, setStreamState] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(liveId));
  const [loadError, setLoadError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(Boolean(liveId));
  const [isSettingsOpen, setIsSettingsOpen] = useState(!liveId);
  const [isMuted, setIsMuted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [pinnedMessageIds, setPinnedMessageIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [nextMessagesCursor, setNextMessagesCursor] = useState(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [areMessagesHydrated, setAreMessagesHydrated] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [pickerMode, setPickerMode] = useState(null);
  const [isRestoringHost, setIsRestoringHost] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState(() => new Set());
  const [moderatingUserId, setModeratingUserId] = useState(null);

  const setStream = useCallback((nextStream) => {
    const normalized = nextStream ? normalizeStream(nextStream) : null;
    streamRef.current = normalized;
    setStreamState(normalized);
    return normalized;
  }, []);

  const isOwner = Boolean(
    location.state?.mode === "owner" ||
    (!liveId && !stream) ||
    (stream?.hostId && String(stream.hostId) === String(currentUser.id)),
  );

  useEffect(() => {
    if (!isOwner) return undefined;

    let cancelled = false;
    usersApi.getBlockedUsers()
      .then((response) => {
        if (!cancelled) setBlockedUserIds(new Set(extractBlockedUserIds(response)));
      })
      .catch((error) => {
        console.error("[live-blocked-users] failed", error?.response?.data || error);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const host = useMemo(() => {
    if (isOwner) return currentUser;
    const stateHost = location.state?.host || {};
    const streamHost = stream?.host || {};
    const source = {
      ...stateHost,
      ...streamHost,
      profile: {
        ...(stateHost.profile || {}),
        ...(streamHost.profile || {}),
      },
    };
    return {
      id: getUserId(source) || stream?.hostId || "live-host",
      name:
        getDisplayName(source) ||
        stream?.hostName ||
        stream?.authorName ||
        "Пользователь",
      username:
        source.username ||
        source.nick ||
        source.nickname ||
        stream?.hostUsername ||
        null,
      avatar:
        streamHost.avatarUrl ||
        streamHost.avatar ||
        streamHost.photoUrl ||
        streamHost.profile?.avatarUrl ||
        streamHost.profile?.avatar ||
        stream?.hostAvatarUrl ||
        stream?.authorAvatarUrl ||
        stream?.avatarUrl ||
        stateHost.avatarUrl ||
        stateHost.avatar ||
        stateHost.photoUrl ||
        stateHost.profile?.avatarUrl ||
        stateHost.profile?.avatar ||
        DEFAULT_AVATAR,
    };
  }, [currentUser, isOwner, location.state, stream]);

  const openUserProfile = useCallback((profileUser) => {
    const username = profileUser?.username || profileUser?.authorUsername;
    const userId = profileUser?.id || profileUser?.authorId;

    if (userId && String(userId) === String(currentUser.id)) {
      navigate("/profile");
      return;
    }
    if (username) navigate(`/profile/${encodeURIComponent(username)}`);
  }, [currentUser.id, navigate]);

  const handleRoomData = useCallback((packet) => {
    switch (packet?.type) {
      case "chat.delete":
        setMessages((current) => current.filter((item) => item.id !== packet.messageId));
        setPinnedMessageIds((current) =>
          current.filter((messageId) => messageId !== packet.messageId),
        );
        break;
      default:
        break;
    }
  }, []);

  const liveKit = useLiveKitBroadcast({
    onData: handleRoomData,
    onDisconnected: () => {
      const activeStream = streamRef.current;
      if (activeStream?.status === LIVE_STATUS) {
        const activeHostId = activeStream.hostId || getUserId(activeStream.host);
        if (activeHostId && String(activeHostId) === String(currentUser.id)) {
          hostReconnectRef.current = null;
        }
        liveStreamsApi.getById(activeStream.id)
          .then((fresh) => {
            const normalized = setStream(fresh);
            if (normalized.status === ENDED_STATUS) setIsEnded(true);
          })
          .catch(() => {});
      }
    },
  });
  const connectLiveKit = liveKit.connect;
  const startLiveAudio = liveKit.startAudio;

  useEffect(() => {
    if (!liveId) {
      pinIntentRef.current.clear();
      pinMutationRef.current.clear();
      setStream(null);
      setIsEnded(false);
      setIsPlaying(false);
      setIsSettingsOpen(true);
      setElapsed(0);
      setLikesCount(0);
      setMessages([]);
      setPinnedMessageIds([]);
      setAreMessagesHydrated(false);
      setNextMessagesCursor(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const isRefreshingCurrent = String(streamRef.current?.id) === String(liveId);
    if (!isRefreshingCurrent) setIsLoading(true);
    setLoadError("");
    if (!isRefreshingCurrent) {
      pinIntentRef.current.clear();
      pinMutationRef.current.clear();
      setAreMessagesHydrated(false);
      setNextMessagesCursor(null);
      setMessages([]);
      setPinnedMessageIds([]);
    }

    const messageRequest = liveStreamsApi
      .getMessages(liveId)
      .catch(() => ({ items: [], nextCursor: null }));

    const loadStream = async () => {
      try {
        const streamPayload = await liveStreamsApi.getById(liveId);
        if (cancelled) return;
        const normalized = normalizeStream(streamPayload);
        const isOwnLoadedStream =
          normalized.hostId && String(normalized.hostId) === String(currentUser.id);
        const shouldResetOwnerStream =
          isOwnLoadedStream &&
          normalized.status === ENDED_STATUS;

        if (shouldResetOwnerStream) {
          if (normalized.status === LIVE_STATUS) {
            await liveStreamsApi.end(normalized.id, {}).catch(() => {});
          }
          removeHostMedia(normalized.id);
          navigate("/live", { replace: true, state: { mode: "owner" } });
          return;
        }

        setStream(normalized);
        setIsEnded(normalized.status === ENDED_STATUS);
        setIsMuted(!normalized.isSoundEnabled);
        setLikesCount(normalized.reactionsCount);
        const cachedMessages = readLiveCache(LIVE_MESSAGES_CACHE_PREFIX, liveId);
        setMessages((current) => mergeMessages(cachedMessages, current));
        setIsLoading(false);

        if (normalized.startedAt) {
          const elapsedUntil = normalized.status === ENDED_STATUS
            ? Date.parse(normalized.endedAt || "")
            : Date.now();
          const startedAt = Date.parse(normalized.startedAt);
          const calculatedElapsed = Number.isFinite(elapsedUntil) && Number.isFinite(startedAt)
            ? Math.max(0, Math.floor((elapsedUntil - startedAt) / 1000))
            : 0;
          setElapsed(normalized.status === ENDED_STATUS
            ? getStreamDurationSec(normalized) || calculatedElapsed
            : calculatedElapsed);
        }

        const messagePayload = await messageRequest;
        if (cancelled) return;
        const backendPinnedIds = messagePayload.items
          .map(normalizeMessage)
          .filter((message) => message.isPinned)
          .map((message) => message.id);
        setMessages((current) => mergeMessages(current, messagePayload.items));
        setNextMessagesCursor(messagePayload.nextCursor || null);
        setPinnedMessageIds((current) => [
          ...new Set([...current, ...backendPinnedIds]),
        ]);
        setAreMessagesHydrated(true);
      } catch (error) {
        if (!cancelled) {
          if (isRefreshingCurrent) {
            console.error("[live-stream-refresh] failed", error);
          } else {
            setLoadError(getLiveErrorMessage(error));
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadStream();

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, liveId, navigate, setStream]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId || !areMessagesHydrated) return;
    writeLiveCache(
      LIVE_MESSAGES_CACHE_PREFIX,
      activeId,
      messages.slice(-MAX_CACHED_MESSAGES),
    );
  }, [areMessagesHydrated, liveId, messages, stream?.id]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (
      !activeId ||
      !areMessagesHydrated ||
      stream?.status !== LIVE_STATUS ||
      isEnded
    ) {
      return undefined;
    }

    let cancelled = false;
    const syncMessages = () => {
      if (messageSyncInFlightRef.current) return;
      messageSyncInFlightRef.current = true;
      liveStreamsApi.getMessages(activeId)
        .then((history) => {
          if (!cancelled) {
            const refreshed = history.items.map(normalizeMessage).map((message) => {
              const pendingState = pinMutationRef.current.get(String(message.id));
              return typeof pendingState === "boolean"
                ? { ...message, isPinned: pendingState }
                : message;
            });
            setMessages((current) => mergeMessages(current, refreshed));
            const refreshedState = new Map(
              refreshed.map((message) => [String(message.id), message.isPinned]),
            );
            setPinnedMessageIds((current) => {
              const next = current.filter((id) => refreshedState.get(String(id)) !== false);
              refreshed.forEach((message) => {
                if (message.isPinned && !next.some((id) => String(id) === String(message.id))) {
                  next.push(message.id);
                }
              });
              return next;
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          messageSyncInFlightRef.current = false;
        });
    };

    const intervalId = window.setInterval(syncMessages, 3_000);
    return () => {
      cancelled = true;
      messageSyncInFlightRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [areMessagesHydrated, isEnded, liveId, stream?.id, stream?.status]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId || stream?.status !== LIVE_STATUS || isEnded) return undefined;

    let cancelled = false;
    const syncCounters = () => {
      if (counterSyncInFlightRef.current) return;
      counterSyncInFlightRef.current = true;
      liveStreamsApi.getById(activeId)
        .then((freshPayload) => {
          if (cancelled) return;
          const fresh = normalizeStream(freshPayload);
          setLikesCount((current) => Math.max(
            Math.max(0, Number(current) || 0),
            Math.max(0, Number(fresh.reactionsCount) || 0),
          ));
          if (fresh.status === ENDED_STATUS) {
            setIsEnded(true);
            setIsPlaying(false);
          }
        })
        .catch(() => {})
        .finally(() => {
          counterSyncInFlightRef.current = false;
        });
    };

    const intervalId = window.setInterval(syncCounters, COUNTER_SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      counterSyncInFlightRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [isEnded, liveId, stream?.id, stream?.status]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId || !accessToken) return undefined;

    const socket = connectLiveSocket(accessToken);
    if (!socket) return undefined;

    const joinStream = () => {
      socket.emit("live:join", { liveStreamId: activeId });
    };

    const handleNewMessage = (payload) => {
      const messageStreamId = getLiveMessageStreamId(payload);
      if (messageStreamId && String(messageStreamId) !== String(activeId)) return;

      const message = getPersistedSocketMessage(payload);
      if (!message) return;
      setMessages((current) => reconcileMessage(current, message));
      if (message.isPinned) {
        setPinnedMessageIds((current) =>
          current.includes(message.id) ? current : [...current, message.id],
        );
      }
    };

    const updatePinnedMessage = (payload, isPinned) => {
      const messageStreamId = getLiveMessageStreamId(payload);
      if (messageStreamId && String(messageStreamId) !== String(activeId)) return;

      const value = unwrap(payload) || {};
      const message = getLiveMessageEnvelope(value);
      const messageId = value.messageId || message?.messageId || message?.id || message?._id;
      if (!messageId) return;

      setPinnedMessageIds((current) => {
        const withoutMessage = current.filter((id) => String(id) !== String(messageId));
        return isPinned ? [...withoutMessage, messageId] : withoutMessage;
      });
      setMessages((current) => current.map((item) =>
        String(item.id) === String(messageId)
          ? { ...item, isPinned, pinnedAt: isPinned ? value.pinnedAt || message?.pinnedAt : null }
          : item
      ));
    };

    const handleReactionUpdate = (payload, incrementWhenMissing = false) => {
      const reactionStreamId = getLiveMessageStreamId(payload);
      if (reactionStreamId && String(reactionStreamId) !== String(activeId)) return;

      const value = unwrap(payload) || {};
      const summary = value.summary || value.reactionSummary || value.data?.summary || {};
      let count = Number(
        value.reactionsCount ??
        value.reactionCount ??
        value.totalReactions ??
        value.count ??
        value.total ??
        summary.reactionsCount ??
        summary.reactionCount ??
        summary.totalReactions ??
        summary.count ??
        summary.total,
      );
      if (!Number.isFinite(count) && summary && typeof summary === "object") {
        const summaryTotal = Object.values(summary).reduce((total, item) => {
          const itemCount = Number(item?.count ?? item);
          return Number.isFinite(itemCount) ? total + itemCount : total;
        }, 0);
        if (summaryTotal > 0) count = summaryTotal;
      }
      if (Number.isFinite(count)) {
        setLikesCount(Math.max(0, count));
        return;
      }

      const reactionUserId =
        value.userId || value.authorId || value.senderId || value.user?.id || null;
      if (
        incrementWhenMissing &&
        (!reactionUserId || String(reactionUserId) !== String(currentUser.id))
      ) {
        setLikesCount((current) => Math.max(0, Number(current) || 0) + 1);
      }
    };

    const handleLiveEnded = (payload) => {
      const endedStreamId = getLiveMessageStreamId(payload);
      if (!endedStreamId || String(endedStreamId) !== String(activeId)) return;
      const value = unwrap(payload) || {};
      setStream({
        ...streamRef.current,
        ...value,
        id: activeId,
        status: ENDED_STATUS,
        endedAt: value.endedAt || new Date().toISOString(),
      });
      setIsEnded(true);
      setIsPlaying(false);
    };
    const handleMessagePinned = (payload) => updatePinnedMessage(payload, true);
    const handleMessageUnpinned = (payload) => updatePinnedMessage(payload, false);
    const handleNewReaction = (payload) => handleReactionUpdate(payload, true);

    const handleSocketException = (payload) => {
      if (payload?.message || payload?.error) {
        toast.error(getLiveErrorMessage({ response: { data: payload } }));
      }
    };

    const handleConnectError = (err) => {
      console.error('[LiveSocket] connect_error:', err?.message ?? err);
    };

    socket.on("connect", joinStream);
    socket.on("connect_error", handleConnectError);
    socket.on("live:message:new", handleNewMessage);
    socket.on("live:message:pinned", handleMessagePinned);
    socket.on("live:message:unpinned", handleMessageUnpinned);
    socket.on("live:reaction:new", handleNewReaction);
    socket.on("live:reaction:summary", handleReactionUpdate);
    socket.on("live:ended", handleLiveEnded);
    socket.on("exception", handleSocketException);
    if (socket.connected) joinStream();

    return () => {
      socket.off("connect", joinStream);
      socket.off("connect_error", handleConnectError);
      socket.off("live:message:new", handleNewMessage);
      socket.off("live:message:pinned", handleMessagePinned);
      socket.off("live:message:unpinned", handleMessageUnpinned);
      socket.off("live:reaction:new", handleNewReaction);
      socket.off("live:reaction:summary", handleReactionUpdate);
      socket.off("live:ended", handleLiveEnded);
      socket.off("exception", handleSocketException);
      if (socket.connected) socket.emit("live:leave", { liveStreamId: activeId });
    };
  }, [accessToken, currentUser.id, liveId, setStream, stream?.id]);

  useEffect(() => {
    const activeId = stream?.id;
    if (
      !activeId ||
      stream.status !== LIVE_STATUS ||
      !isOwner ||
      isLoading ||
      isStarting ||
      liveKit.isConnected ||
      liveKit.isConnecting ||
      hostReconnectRef.current === activeId
    ) {
      return;
    }

    hostReconnectRef.current = activeId;
    setIsRestoringHost(true);

    const restoreHostConnection = async () => {
      let media = readHostMedia(activeId);

      try {
        if (media) {
          try {
            await liveKit.connect(media, { isHost: true });
          } catch {
            media = null;
          }
        }

        if (!media) {
          const refreshed = await liveStreamsApi.start(activeId);
          media = extractLiveMedia(refreshed);
          cacheHostMedia(activeId, media);
          await liveKit.connect(media, { isHost: true });
          setStream({ ...streamRef.current, ...refreshed, status: LIVE_STATUS });
        }

        if (isMuted) await liveKit.setMicrophoneEnabled(false);
        setIsPlaying(true);
      } catch (error) {
        hostReconnectRef.current = null;
        toast.error(getLiveErrorMessage(error));
      } finally {
        setIsRestoringHost(false);
      }
    };

    restoreHostConnection();
  }, [
    isLoading,
    isMuted,
    isOwner,
    isStarting,
    liveKit,
    setStream,
    stream?.id,
    stream?.status,
  ]);

  useEffect(() => {
    if (isEnded || stream?.status !== LIVE_STATUS) return undefined;
    const intervalId = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isEnded, stream?.status]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    const shouldConnect =
      !isOwner &&
      !isEnded &&
      activeId &&
      stream?.status === LIVE_STATUS;

    if (!shouldConnect) {
      viewerAutoConnectRef.current = null;
      return undefined;
    }

    setIsPlaying(true);
    if (
      liveKit.isConnected ||
      liveKit.isConnecting ||
      viewerAutoConnectRef.current === String(activeId)
    ) {
      return undefined;
    }

    let cancelled = false;
    viewerAutoConnectRef.current = String(activeId);

    (async () => {
      try {
        const tokenPayload = await liveStreamsApi.getJoinToken(activeId);
        await connectLiveKit(extractLiveMedia(tokenPayload), { isHost: false });
        if (!cancelled) {
          setIsPlaying(true);
          await startLiveAudio().catch(() => {});
        }
      } catch (error) {
        if (!cancelled) {
          viewerAutoConnectRef.current = null;
          setIsPlaying(false);
          console.error("[live-viewer-auto-connect] failed", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    connectLiveKit,
    isEnded,
    isOwner,
    liveId,
    startLiveAudio,
    stream?.id,
    stream?.status,
  ]);

  const handleStartBroadcast = async () => {
    if (isStarting || liveKit.isConnecting) return;

    let startedStreamId = null;
    let isReconnectAttempt = false;
    try {
      setIsStarting(true);
      let target = stream;
      const createScheduledStream = async () => normalizeStream(
  await liveStreamsApi.create({
    title: "Прямой эфир",
  }),
);

      if (!target?.id) {
        try {
          target = await createScheduledStream();
        } catch (error) {
          if (error?.response?.status !== 409 || !currentUser.username) throw error;
          const ownStreams = await liveStreamsApi.listByUsername(currentUser.username);
          const existing = ownStreams
            .map(normalizeStream)
            .find((item) => item.status === LIVE_STATUS || item.status === "SCHEDULED");
          if (!existing) throw error;
          target = existing;
        }
      }

      let startedPayload = null;
      if (target.status === LIVE_STATUS) {
        isReconnectAttempt = true;
        const cachedMedia = readHostMedia(target.id);
        if (cachedMedia?.url && cachedMedia?.token) {
          startedPayload = { ...target, media: cachedMedia };
        } else {
          startedPayload = await liveStreamsApi.start(target.id);
        }
      }

      if (!startedPayload) {
        startedPayload = await liveStreamsApi.start(target.id);
      }
      const started = setStream({ ...target, ...startedPayload, status: LIVE_STATUS });
      startedStreamId = started.id;
      hostReconnectRef.current = started.id;
      const hostMedia = extractLiveMedia(startedPayload);
      cacheHostMedia(started.id, hostMedia);
      await liveKit.connect(hostMedia, { isHost: true });
      if (isMuted) await liveKit.setMicrophoneEnabled(false);
      if (isMuted) {
        await liveStreamsApi.updateSettings(started.id, {
          isSoundEnabled: !isMuted,
        });
      }
      setElapsed(0);
      setIsEnded(false);
      setIsPlaying(true);
      navigate(`/live/${encodeURIComponent(started.id)}`, {
        replace: true,
        state: { mode: "owner" },
      });
      toast.success("Прямой эфир запущен");
    } catch (error) {
      console.error("[live-stream-start] failed", error);
      if (startedStreamId) {
        if (!isReconnectAttempt) {
          await liveStreamsApi.end(startedStreamId, {}).catch(() => {});
        }
        await liveKit.disconnect().catch(() => {});
        removeHostMedia(startedStreamId);
        hostReconnectRef.current = null;
        if (!isReconnectAttempt) {
          const failedStream = streamRef.current;
          setStream(failedStream?.id === startedStreamId
            ? { ...failedStream, status: ENDED_STATUS }
            : failedStream);
          setIsEnded(true);
        }
      }
      toast.error(getLiveErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  };

  const handleSend = async (messageText) => {
    const activeId = stream?.id || liveId;
    const socket = connectLiveSocket(getSessionAccessToken() || accessToken);
    if (!activeId || !socket) {
      const error = new Error("LIVE_CHAT_UNAVAILABLE");
      toast.error(getLiveErrorMessage(error, "liveErrors.chatUnavailable"));
      throw error;
    }

    const pendingMessage = {
      id: `pending-${crypto.randomUUID?.() || `${Date.now()}-${currentUser.id}`}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorUsername: currentUser.username,
      avatar: currentUser.avatar,
      text: messageText,
      createdAt: new Date().toISOString(),
      isPersisted: false,
    };
    setMessages((current) => appendUniqueMessage(current, pendingMessage));

    socket.emit(
      "live:message:send",
      { liveStreamId: activeId, text: messageText },
      (...acknowledgement) => {
        const response = acknowledgement.length > 1
          ? acknowledgement[1]
          : acknowledgement[0];
        const hasError =
          response?.success === false ||
          response?.ok === false ||
          Number(response?.statusCode) >= 400 ||
          Boolean(response?.error);

        if (hasError) {
          setMessages((current) => current.filter((item) => item.id !== pendingMessage.id));
          toast.error(getLiveErrorMessage(
            { response: { data: response } },
            "liveErrors.sendMessage",
          ));
          return;
        }

        const savedMessage = getPersistedSocketMessage(response);
        if (savedMessage) {
          setMessages((current) => reconcileMessage(current, savedMessage));
        }
      },
    );

  };

  const handleLoadOlderMessages = async () => {
    const activeId = stream?.id || liveId;
    if (!activeId || !nextMessagesCursor || isLoadingOlderMessages) return;

    try {
      setIsLoadingOlderMessages(true);
      const history = await liveStreamsApi.getMessages(activeId, {
        cursor: nextMessagesCursor,
      });
      setMessages((current) => mergeMessages(history.items, current));
      setNextMessagesCursor(history.nextCursor || null);
    } catch (error) {
      toast.error(getLiveErrorMessage(error, "liveErrors.chatHistory"));
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleReact = async (reaction) => {
    if (isEnded || stream?.status === ENDED_STATUS) {
      toast.info(getLiveErrorMessage(
        { response: { status: 410, data: { code: "LIVE_STREAM_NOT_ACTIVE" } } },
      ));
      return;
    }
    if (stream?.status !== LIVE_STATUS) {
      toast.info(getLiveErrorMessage(
        { response: { data: { code: "LIVE_STREAM_NOT_STARTED" } } },
      ));
      return;
    }
    const activeId = stream?.id || liveId;
    const socket = connectLiveSocket(getSessionAccessToken() || accessToken);
    if (!activeId || !socket) {
      toast.error(getLiveErrorMessage(
        { response: { data: { code: "LIVE_CHAT_UNAVAILABLE" } } },
      ));
      return;
    }

    const type = liveEmojiToReactionType(reaction);
    if (!type) return;

    setLikesCount((current) => Math.max(0, Number(current) || 0) + 1);
    socket.emit(
      "live:reaction:send",
      { liveStreamId: activeId, type },
      (ack) => {
        if (!ack?.ok) {
          console.error('Live reaction error:', {
            ack,
            liveStreamId: activeId,
            type,
            connected: socket?.connected,
          });

          if (ack?.code === 'LIVE_REACTION_RATE_LIMIT') {
            setLikesCount((current) => Math.max(0, (Number(current) || 0) - 1));
            return;
          }

          setLikesCount((current) => Math.max(0, (Number(current) || 0) - 1));
          toast.error(getLiveErrorMessage({ response: { data: ack } }));
          return;
        }

        const count = Number(ack.reactionsCount ?? ack.total ?? ack.count);
        if (Number.isFinite(count)) setLikesCount(Math.max(0, count));
      },
    );
  };

  const handleToggleMuted = async () => {
    if (!isOwner) return;
    const nextMuted = !isMuted;
    if (!stream?.id) {
      setIsMuted(nextMuted);
      return;
    }
    try {
      await liveKit.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
      setStream({ ...stream, isSoundEnabled: !nextMuted });

      try {
        await liveStreamsApi.updateSettings(stream.id, {
          isSoundEnabled: !nextMuted,
        });
      } catch (error) {
        toast.error(getLiveErrorMessage(error));
      }
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    }
  };

  const handleEnd = async () => {
    if (!isOwner || !stream?.id || isEnding) return;
    setIsEnding(true);
    try {
      const endedPayload = await liveStreamsApi.end(stream.id, {});
      await liveKit.disconnect();
      removeHostMedia(stream.id);
      hostReconnectRef.current = null;
      pinIntentRef.current.clear();
      pinMutationRef.current.clear();
      setStream({ ...stream, ...endedPayload, status: ENDED_STATUS });
      setIsEnded(true);
      setIsPlaying(false);
      setIsSettingsOpen(false);
      toast.success("Эфир завершён");
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    } finally {
      setIsEnding(false);
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!stream?.id) return;
    try {
      if (message.isPersisted) {
        await liveStreamsApi.deleteMessage(stream.id, message.id);
      }
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setPinnedMessageIds((current) =>
        current.filter((messageId) => messageId !== message.id),
      );
      await liveKit.publishData({ type: "chat.delete", messageId: message.id }).catch(() => {});
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    }
  };

  const handlePinMessage = async (message) => {
    const activeId = stream?.id || liveId;
    if (!activeId || !message?.id) return;

    const requestedMessageId = message.id;
    const isPinned = Boolean(message.isPinned) || pinnedMessageIds.some(
      (id) => String(id) === String(requestedMessageId),
    );
    const nextPinned = !isPinned;

    setPinnedMessageIds((current) => nextPinned
      ? [...current.filter((id) => String(id) !== String(requestedMessageId)), requestedMessageId]
      : current.filter((id) => String(id) !== String(requestedMessageId)));
    setMessages((current) => current.map((item) =>
      String(item.id) === String(requestedMessageId)
        ? { ...item, isPinned: nextPinned }
        : item
    ));

    if (!message.isPersisted || String(message.id).startsWith("pending-")) {
      pinIntentRef.current.set(String(requestedMessageId), {
        activeId,
        isPinned,
        message,
        nextPinned,
      });
      return;
    }

    pinMutationRef.current.set(String(requestedMessageId), nextPinned);
    try {
      if (nextPinned) {
        await liveStreamsApi.pinMessage(activeId, requestedMessageId);
      } else {
        await liveStreamsApi.unpinMessage(activeId, requestedMessageId);
      }
    } catch (error) {
      setPinnedMessageIds((current) => isPinned
        ? [...current.filter((id) => String(id) !== String(requestedMessageId)), requestedMessageId]
        : current.filter((id) => String(id) !== String(requestedMessageId)));
      setMessages((current) => current.map((item) =>
        String(item.id) === String(requestedMessageId) ? { ...item, isPinned } : item
      ));
      toast.error(getLiveErrorMessage(error));
    } finally {
      if (pinMutationRef.current.get(String(requestedMessageId)) === nextPinned) {
        pinMutationRef.current.delete(String(requestedMessageId));
      }
    }
  };

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId || pinIntentRef.current.size === 0) return;

    for (const [pendingId, intent] of pinIntentRef.current.entries()) {
      if (String(intent.activeId) !== String(activeId)) {
        pinIntentRef.current.delete(pendingId);
        continue;
      }

      const persistedMessage = messages.find((item) => {
        if (!item.isPersisted || String(item.id).startsWith("pending-")) return false;
        if (item.text !== intent.message.text) return false;
        if (
          item.authorId &&
          intent.message.authorId &&
          String(item.authorId) !== String(intent.message.authorId)
        ) {
          return false;
        }
        const savedAt = Date.parse(item.createdAt);
        const pendingAt = Date.parse(intent.message.createdAt);
        return !Number.isFinite(savedAt) ||
          !Number.isFinite(pendingAt) ||
          Math.abs(savedAt - pendingAt) < 30_000;
      });
      if (!persistedMessage) continue;

      pinIntentRef.current.delete(pendingId);
      const persistedId = persistedMessage.id;
      setPinnedMessageIds((current) => intent.nextPinned
        ? [
          ...current.filter((id) =>
            String(id) !== String(pendingId) && String(id) !== String(persistedId)
          ),
          persistedId,
        ]
        : current.filter((id) =>
          String(id) !== String(pendingId) && String(id) !== String(persistedId)
        ));
      setMessages((current) => current.map((item) =>
        String(item.id) === String(persistedId)
          ? { ...item, isPinned: intent.nextPinned }
          : item
      ));

      pinMutationRef.current.set(String(persistedId), intent.nextPinned);
      const request = intent.nextPinned
        ? liveStreamsApi.pinMessage(activeId, persistedId)
        : liveStreamsApi.unpinMessage(activeId, persistedId);
      request.catch((error) => {
        setPinnedMessageIds((current) => intent.isPinned
          ? [...current.filter((id) => String(id) !== String(persistedId)), persistedId]
          : current.filter((id) => String(id) !== String(persistedId)));
        setMessages((current) => current.map((item) =>
          String(item.id) === String(persistedId)
            ? { ...item, isPinned: intent.isPinned }
            : item
        ));
        toast.error(getLiveErrorMessage(error));
      }).finally(() => {
        if (pinMutationRef.current.get(String(persistedId)) === intent.nextPinned) {
          pinMutationRef.current.delete(String(persistedId));
        }
      });
    }
  }, [liveId, messages, stream?.id]);

  const handleModerate = async (action, message) => {
    const userId = message?.authorId;
    if (!userId || String(userId) === String(currentUser.id) || moderatingUserId) return;

    setModeratingUserId(String(userId));
    try {
      if (action === "block") {
        await usersApi.blockUser(userId);
        setBlockedUserIds((current) => new Set(current).add(String(userId)));
        toast.success(`${message.authorName} заблокирован`);
      } else if (action === "unblock") {
        await usersApi.unblockUser(userId);
        setBlockedUserIds((current) => {
          const next = new Set(current);
          next.delete(String(userId));
          return next;
        });
        toast.success(`${message.authorName} разблокирован`);
      } else if (action === "report") {
        await usersApi.reportUser(userId, "LIVE_STREAM_CHAT");
        toast.success("Жалоба отправлена");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
    } finally {
      setModeratingUserId(null);
    }
  };

  const handlePickerConfirm = async (users) => {
    if (!stream?.id || users.length === 0) return;
    const userIds = users.map((user) => getUserId(user)).filter(Boolean);
    try {
      if (pickerMode === "tag") {
        await liveStreamsApi.tagUsers(stream.id, userIds);
        toast.success("Пользователи отмечены");
      } else {
        await liveStreamsApi.share(stream.id, userIds);
        toast.success("Эфир отправлен в сообщения");
      }
      setPickerMode(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
    }
  };

  const handleCopyLink = async () => {
    const activeId = stream?.id || liveId;
    if (!activeId) return;
    try {
      const shared = await liveStreamsApi.share(activeId, []);
      const link = shared?.link || shared?.url || `${window.location.origin}/live/${activeId}`;
      await navigator.clipboard.writeText(link);
      toast.success("Ссылка на эфир скопирована");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
    }
  };

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate(isOwner ? "/profile" : "/first-page");
  };

  const handleToggleChat = () => {
    setIsChatOpen((current) => {
      const next = !current;
      if (next) {
        window.requestAnimationFrame(() => {
          chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return next;
    });
  };

  const viewerCount = liveKit.participantCount > 0
    ? Math.max(0, liveKit.participantCount - 1)
    : stream?.viewersCount || 0;

  return (
    <main className="livePage">
      <LiveHeader />
      <div className="livePage__background" aria-hidden="true" />

      <div className="livePage__content">
        <div className="livePage__headingRow">
          <button type="button" className="livePage__back" onClick={handleBack} aria-label="Назад">
            <img src={profileIcons.storyBack} alt="" />
          </button>
          <h1>{stream?.title || "Прямой эфир"}</h1>
          <span aria-hidden="true" />
        </div>

        {isLoading ? <div className="livePage__state">Загрузка эфира...</div> : null}
        {!isLoading && loadError ? (
          <div className="livePage__state livePage__state--error">
            <p>{loadError}</p>
            <button type="button" onClick={handleBack}>Вернуться</button>
          </div>
        ) : null}

        {!isLoading && !loadError ? (
          <div className={`livePage__broadcastLayout ${!isChatOpen ? "livePage__broadcastLayout--chatClosed" : ""}`}>
            <LiveStage
              isOwner={isOwner}
              isLive={stream?.status === LIVE_STATUS}
              host={host}
              elapsed={elapsed}
              endedPeriodLabel={formatEndedPeriod(stream, locale)}
              endedDurationLabel={formatDuration(getStreamDurationSec(stream) || elapsed)}
              isEnded={isEnded}
              isPlaying={isPlaying}
              isSettingsOpen={isSettingsOpen}
              isMuted={isMuted}
              videoTrack={liveKit.videoTrack}
              audioTrack={liveKit.audioTrack}
              isCameraStarting={isStarting || isRestoringHost || liveKit.isConnecting}
              isEnding={isEnding}
              viewerCount={formatCompactCount(viewerCount)}
              likesCount={formatCompactCount(likesCount)}
              onToggleSettings={() => setIsSettingsOpen((current) => !current)}
              onToggleMuted={handleToggleMuted}
              onStartCamera={handleStartBroadcast}
              onShare={() => stream?.id ? setPickerMode("share") : toast.info("Сначала запустите эфир")}
              onReact={handleReact}
              isChatOpen={isChatOpen}
              onToggleChat={handleToggleChat}
              onEnd={handleEnd}
              onOpenHostProfile={() => openUserProfile(host)}
            />

            {isChatOpen && (
              <LiveChat
                ref={chatRef}
                isOwner={isOwner}
                currentUser={currentUser}
                messages={messages}
                pinnedMessageIds={pinnedMessageIds}
                isEnded={isEnded}
                hasOlderMessages={Boolean(nextMessagesCursor)}
                isLoadingOlderMessages={isLoadingOlderMessages}
                onSend={handleSend}
                onLoadOlder={handleLoadOlderMessages}
                onPin={handlePinMessage}
                onDelete={handleDeleteMessage}
                onReply={() => {}}
                onModerate={handleModerate}
                onOpenProfile={openUserProfile}
                blockedUserIds={blockedUserIds}
                moderatingUserId={moderatingUserId}
              />
            )}
          </div>
        ) : null}
      </div>

      <LiveUserPicker
        isOpen={Boolean(pickerMode)}
        mode={pickerMode}
        onClose={() => setPickerMode(null)}
        onConfirm={handlePickerConfirm}
        onCopyLink={pickerMode === "share" ? handleCopyLink : undefined}
      />
    </main>
  );
}
