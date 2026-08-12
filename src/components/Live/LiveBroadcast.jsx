import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useLiveKitBroadcast } from "../../hooks/useLiveKitBroadcast";
import { extractLiveMedia, liveStreamsApi } from "../../services/liveStreamsApi";
import { getSessionAccessToken } from "../../services/api";
import { connectSocket, getSocket } from "../../services/socket";
import { usersApi } from "../../services/usersApi";
import { uploadVideoMedia } from "../../services/videoMediaUploadApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getLiveErrorMessage } from "../../utils/getLiveErrorMessage";
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
const LIVE_PINNED_CACHE_PREFIX = "meyou_live_pinned_messages:";
const LIVE_REACTIONS_CACHE_PREFIX = "meyou_live_reactions:";
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
    isSoundEnabled: value.isSoundEnabled !== false,
    isSaved: Boolean(value.isSaved),
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
  };
}

function appendUniqueMessage(list, message) {
  if (!message?.id || list.some((item) => item.id === message.id)) return list;
  return [...list, message];
}

function reconcileMessage(list, incoming) {
  if (!incoming?.id) return list;
  if (list.some((item) => item.id === incoming.id)) return list;

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
  next[pendingIndex] = incoming;
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

function readCachedReactionCount(streamId) {
  if (!streamId) return 0;
  try {
    const value = Number(localStorage.getItem(`${LIVE_REACTIONS_CACHE_PREFIX}${streamId}`));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function cacheReactionCount(streamId, value) {
  if (!streamId) return;
  try {
    const previous = readCachedReactionCount(streamId);
    localStorage.setItem(
      `${LIVE_REACTIONS_CACHE_PREFIX}${streamId}`,
      String(Math.max(previous, 0, Number(value) || 0)),
    );
  } catch {
    // Realtime and backend values remain the source of truth without storage.
  }
}

function formatCompactCount(value) {
  const number = Number(value) || 0;
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1).replace(".", ",")}K`;
  }
  return String(number);
}

function getPlaybackUrl(payload) {
  const value = unwrap(payload) || {};
  return (
    value.recordingUrl ||
    value.playbackUrl ||
    value.mediaUrl ||
    value.url ||
    value.media?.url ||
    null
  );
}

function getRecordingMimeType() {
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
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
  const storeToken = useAuthStore((state) => state.token);
  const accessToken = storeToken || getSessionAccessToken();
  const chatRef = useRef(null);
  const streamRef = useRef(null);
  const hostReconnectRef = useRef(null);
  const viewerAutoConnectRef = useRef(null);
  const recordingSessionRef = useRef(null);
  const shouldSaveRef = useRef(false);
  const unmountFinalizationRef = useRef(null);

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
  const [shouldSave, setShouldSave] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [recordingRevision, setRecordingRevision] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [pinnedMessageIds, setPinnedMessageIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [nextMessagesCursor, setNextMessagesCursor] = useState(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [areMessagesHydrated, setAreMessagesHydrated] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);
  const [isRestoringHost, setIsRestoringHost] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState(() => new Set());
  const [moderatingUserId, setModeratingUserId] = useState(null);

  useEffect(() => {
    shouldSaveRef.current = shouldSave;
  }, [shouldSave]);

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
      case "chat.pin": {
        if (!packet.messageId) break;
        setPinnedMessageIds((current) => {
          const withoutMessage = current.filter((messageId) => messageId !== packet.messageId);
          return packet.isPinned === false
            ? withoutMessage
            : [...withoutMessage, packet.messageId];
        });
        break;
      }
      case "reaction":
        setLikesCount((current) => {
          const absoluteCount = Number(packet.reactionsCount ?? packet.likesCount);
          return Number.isFinite(absoluteCount)
            ? Math.max(current + 1, absoluteCount)
            : current + 1;
        });
        break;
      case "stream.ended":
        setIsEnded(true);
        setIsPlaying(false);
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

  const stopLocalRecording = useCallback(() => {
    const session = recordingSessionRef.current;
    if (!session?.recorder) return Promise.resolve(null);
    if (session.stopPromise) return session.stopPromise;

    session.stopPromise = new Promise((resolve) => {
      const finish = () => {
        const blob = session.chunks.length
          ? new Blob(session.chunks, { type: session.mimeType || "video/webm" })
          : null;
        if (recordingSessionRef.current === session) recordingSessionRef.current = null;
        setRecordingRevision((current) => current + 1);
        resolve(blob);
      };

      session.recorder.addEventListener("stop", finish, { once: true });
      if (session.recorder.state === "inactive") finish();
      else session.recorder.stop();
    });

    return session.stopPromise;
  }, []);

  const finalizeStreamOnUnmount = useCallback(async (activeStream, saveRecording) => {
    if (!activeStream?.id) return;
    if (unmountFinalizationRef.current?.streamId === activeStream.id) {
      return unmountFinalizationRef.current.promise;
    }

    const promise = (async () => {
      let recordingUrl = null;
      if (saveRecording) {
        const recordingBlob = await stopLocalRecording();
        if (recordingBlob?.size) {
          const extension = recordingBlob.type.includes("mp4") ? "mp4" : "webm";
          const recordingFile = new File(
            [recordingBlob],
            `live-${activeStream.id}-${Date.now()}.${extension}`,
            { type: recordingBlob.type || "video/webm" },
          );
          const uploaded = await uploadVideoMedia(recordingFile);
          recordingUrl = uploaded.mediaUrl;
          await liveStreamsApi.updateSettings(activeStream.id, {
            isSaved: true,
            recordingUrl,
            recordingStatus: "READY",
          });
        }
      } else {
        await stopLocalRecording();
      }

      await liveStreamsApi.end(
        activeStream.id,
        recordingUrl ? { recordingUrl } : {},
      );
      removeHostMedia(activeStream.id);
    })();

    unmountFinalizationRef.current = { streamId: activeStream.id, promise };
    return promise;
  }, [stopLocalRecording]);

  useEffect(() => () => {
    const activeStream = streamRef.current;
    const activeHostId = activeStream?.hostId || getUserId(activeStream?.host);
    const ownsActiveStream =
      activeStream?.status === LIVE_STATUS &&
      activeHostId &&
      String(activeHostId) === String(currentUser.id);

    if (!ownsActiveStream) return;
    finalizeStreamOnUnmount(activeStream, shouldSaveRef.current)
      .catch(() => liveStreamsApi.end(activeStream.id, {}).catch(() => {}));
  }, [currentUser.id, finalizeStreamOnUnmount]);

  useEffect(() => {
    if (!isOwner || stream?.status !== LIVE_STATUS || isEnded || !shouldSave) {
      return undefined;
    }

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isEnded, isOwner, shouldSave, stream?.status]);

useEffect(() => {
  const videoMediaTrack = liveKit.videoTrack?.mediaStreamTrack;
  const audioMediaTrack = liveKit.audioTrack?.mediaStreamTrack;

  const canRecord =
    isOwner &&
    stream?.status === LIVE_STATUS &&
    !isEnded &&
    !isEnding &&
    window.MediaRecorder &&
    videoMediaTrack;

  if (!canRecord || recordingSessionRef.current) return undefined;

  const tracks = [videoMediaTrack, audioMediaTrack].filter(Boolean);
  const mediaStream = new MediaStream(tracks);

  const mimeType = getRecordingMimeType();

  const recorder = new MediaRecorder(
    mediaStream,
    mimeType
      ? {
          mimeType,
          videoBitsPerSecond: 1_200_000,
          audioBitsPerSecond: 64_000,
        }
      : {
          videoBitsPerSecond: 1_200_000,
          audioBitsPerSecond: 64_000,
        },
  );

  const session = {
    recorder,
    chunks: [],
    mimeType: mimeType || recorder.mimeType,
  };

  recordingSessionRef.current = session;

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) {
      session.chunks.push(event.data);
    }
  });

  recorder.start(1_000);

  return undefined;
}, [
  isEnded,
  isEnding,
  isOwner,
  liveKit.audioTrack,
  liveKit.videoTrack,
  recordingRevision,
  stream?.status,
]);

  useEffect(() => {
    if (!liveId) {
      setStream(null);
      setIsEnded(false);
      setIsPlaying(false);
      setIsSettingsOpen(true);
      setPlaybackUrl(null);
      setElapsed(0);
      setNextMessagesCursor(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const isRefreshingCurrent = String(streamRef.current?.id) === String(liveId);
    if (!isRefreshingCurrent) setIsLoading(true);
    setLoadError("");
    if (!isRefreshingCurrent) {
      setAreMessagesHydrated(false);
      setNextMessagesCursor(null);
    }

    Promise.all([
      liveStreamsApi.getById(liveId),
      liveStreamsApi.getMessages(liveId).catch(() => ({ items: [] })),
    ])
      .then(async ([streamPayload, messagePayload]) => {
        if (cancelled) return;
        const normalized = normalizeStream(streamPayload);
        const isOwnLoadedStream =
          normalized.hostId && String(normalized.hostId) === String(currentUser.id);
        const shouldResetOwnerStream =
          isOwnLoadedStream &&
          (normalized.status === ENDED_STATUS ||
            (normalized.status === LIVE_STATUS && !readHostMedia(normalized.id)));

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
        setShouldSave(normalized.isSaved);
        setLikesCount(Math.max(
          normalized.reactionsCount,
          readCachedReactionCount(liveId),
        ));
        const cachedMessages = readLiveCache(LIVE_MESSAGES_CACHE_PREFIX, liveId);
        const cachedPinnedIds = readLiveCache(LIVE_PINNED_CACHE_PREFIX, liveId);
        const backendPinnedIds = messagePayload.items
          .map(normalizeMessage)
          .filter((message) => message.isPinned)
          .map((message) => message.id);
        setMessages((current) =>
          mergeMessages(cachedMessages, current, messagePayload.items),
        );
        setNextMessagesCursor(messagePayload.nextCursor || null);
        setPinnedMessageIds([...new Set([...cachedPinnedIds, ...backendPinnedIds])]);
        setAreMessagesHydrated(true);

        if (normalized.startedAt) {
          setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(normalized.startedAt)) / 1000)));
        }

        if (normalized.status === ENDED_STATUS) {
          try {
            const playback = await liveStreamsApi.getPlayback(normalized.id);
            if (!cancelled) setPlaybackUrl(getPlaybackUrl(playback));
          } catch {
            if (!cancelled) setPlaybackUrl(null);
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isRefreshingCurrent) {
            console.error("[live-stream-refresh] failed", error);
          } else {
            setLoadError(getLiveErrorMessage(error));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

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
    writeLiveCache(LIVE_PINNED_CACHE_PREFIX, activeId, pinnedMessageIds);
  }, [areMessagesHydrated, liveId, messages, pinnedMessageIds, stream?.id]);

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
      liveStreamsApi.getMessages(activeId)
        .then((history) => {
          if (!cancelled) {
            setMessages((current) => mergeMessages(current, history.items));
          }
        })
        .catch(() => {});
    };

    const intervalId = window.setInterval(syncMessages, 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [areMessagesHydrated, isEnded, liveId, stream?.id, stream?.status]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId) return;
    cacheReactionCount(activeId, likesCount);
  }, [likesCount, liveId, stream?.id]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId || stream?.status !== LIVE_STATUS || isEnded) return undefined;

    let cancelled = false;
    const syncCounters = () => {
      liveStreamsApi.getById(activeId)
        .then((freshPayload) => {
          if (cancelled) return;
          const fresh = normalizeStream(freshPayload);
          setLikesCount((current) => Math.max(
            current,
            fresh.reactionsCount,
            readCachedReactionCount(activeId),
          ));
          if (fresh.status === ENDED_STATUS) {
            setIsEnded(true);
            setIsPlaying(false);
          }
        })
        .catch(() => {});
    };

    const intervalId = window.setInterval(syncCounters, COUNTER_SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isEnded, liveId, stream?.id, stream?.status]);

  useEffect(() => {
    const activeId = stream?.id || liveId;
    if (!activeId || !accessToken) return undefined;

    const socket = connectSocket(accessToken);
    if (!socket) return undefined;

    const joinStream = () => {
      socket.emit("live:join", { streamId: activeId });
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

    const handleSocketException = (payload) => {
      if (payload?.message || payload?.error) {
        toast.error(getLiveErrorMessage({ response: { data: payload } }));
      }
    };

    socket.on("connect", joinStream);
    socket.on("live:message:new", handleNewMessage);
    socket.on("exception", handleSocketException);
    if (socket.connected) joinStream();

    return () => {
      socket.off("connect", joinStream);
      socket.off("live:message:new", handleNewMessage);
      socket.off("exception", handleSocketException);
    };
  }, [accessToken, liveId, stream?.id]);

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

  const ensureViewerConnected = useCallback(async () => {
    if (liveKit.isConnected) return;
    const activeId = stream?.id || liveId;
    if (!activeId || stream?.status !== LIVE_STATUS) {
      throw new Error("Эфир ещё не начался");
    }
    const tokenPayload = await liveStreamsApi.getJoinToken(activeId);
    await liveKit.connect(extractLiveMedia(tokenPayload), { isHost: false });
  }, [liveId, liveKit, stream]);

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
        const cachedMedia = readHostMedia(target.id);
        if (cachedMedia?.url && cachedMedia?.token) {
          startedPayload = { ...target, media: cachedMedia };
        } else {
          await liveStreamsApi.end(target.id, {});
          removeHostMedia(target.id);
          target = await createScheduledStream();
          toast.info("Предыдущий зависший эфир завершён, запускаем новый");
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
      if (isMuted || shouldSave) {
        await liveStreamsApi.updateSettings(started.id, {
          isSoundEnabled: !isMuted,
          isSaved: shouldSave,
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
        await liveStreamsApi.end(startedStreamId, {}).catch(() => {});
        await liveKit.disconnect().catch(() => {});
        removeHostMedia(startedStreamId);
        hostReconnectRef.current = null;
        const failedStream = streamRef.current;
        setStream(failedStream?.id === startedStreamId
          ? { ...failedStream, status: ENDED_STATUS }
          : failedStream);
        setIsEnded(true);
      }
      toast.error(getLiveErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  };

  const handleTogglePlaying = async () => {
    if (isEnded || playbackUrl) return;
    try {
      if (!liveKit.isConnected) await ensureViewerConnected();
      if (!isPlaying) await liveKit.startAudio();
      setIsPlaying((current) => !current);
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    }
  };

  const handleSend = async (messageText) => {
    const activeId = stream?.id || liveId;
    const socket = getSocket() || connectSocket(accessToken);
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
      { streamId: activeId, text: messageText },
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

    window.setTimeout(() => {
      liveStreamsApi.getMessages(activeId)
        .then((history) => {
          setMessages((current) => mergeMessages(current, history.items));
        })
        .catch(() => {});
    }, 800);
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
        { response: { status: 410, data: { code: "LIVE_STREAM_ENDED" } } },
      ));
      return;
    }
    if (stream?.status !== LIVE_STATUS) {
      toast.info(getLiveErrorMessage(
        { response: { data: { code: "LIVE_STREAM_NOT_STARTED" } } },
      ));
      return;
    }
    try {
      if (!liveKit.isConnected) await ensureViewerConnected();
      await liveKit.publishData({
        type: "reaction",
        reaction,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
      }, { reliable: true });
      setLikesCount((current) => current + 1);
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    }
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
      await liveStreamsApi.updateSettings(stream.id, {
        isSoundEnabled: !nextMuted,
      });
      setIsMuted(nextMuted);
      setStream({ ...stream, isSoundEnabled: !nextMuted });
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    }
  };

  const handleToggleSave = async () => {
    if (!isOwner) return;
    const nextValue = !shouldSave;
    if (!stream?.id) {
      setShouldSave(nextValue);
      return;
    }
    try {
      await liveStreamsApi.updateSettings(stream.id, { isSaved: nextValue });
      setShouldSave(nextValue);
      setStream({ ...stream, isSaved: nextValue });
    } catch (error) {
      toast.error(getLiveErrorMessage(error));
    }
  };

  const handleEnd = async () => {
    if (!isOwner || !stream?.id || isEnding) return;
    setIsEnding(true);
    try {
      let recordingUrl = null;
      if (shouldSave) {
        const recordingBlob = await stopLocalRecording();
        if (!recordingBlob?.size) {
          throw new Error("Не удалось создать файл записи эфира");
        }
        const extension = recordingBlob.type.includes("mp4") ? "mp4" : "webm";
        const recordingFile = new File(
          [recordingBlob],
          `live-${stream.id}-${Date.now()}.${extension}`,
          { type: recordingBlob.type || "video/webm" },
        );
        const uploaded = await uploadVideoMedia(recordingFile);
        recordingUrl = uploaded.mediaUrl;
        await liveStreamsApi.updateSettings(stream.id, {
          isSaved: true,
          recordingUrl,
          recordingStatus: "READY",
        });
      } else {
        await stopLocalRecording();
      }

      await liveKit.publishData({ type: "stream.ended" }).catch(() => {});
      const endedPayload = await liveStreamsApi.end(
        stream.id,
        recordingUrl ? { recordingUrl } : {},
      );
      await liveKit.disconnect();
      removeHostMedia(stream.id);
      hostReconnectRef.current = null;
      setStream({ ...stream, ...endedPayload, status: ENDED_STATUS });
      setIsEnded(true);
      setIsPlaying(false);
      setIsSettingsOpen(false);
      toast.success(shouldSave ? "Эфир завершён, запись обрабатывается" : "Эфир завершён");
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

  const handlePinMessage = async (messageId) => {
    const isPinned = pinnedMessageIds.includes(messageId);
    setPinnedMessageIds((current) => isPinned
      ? current.filter((id) => id !== messageId)
      : [...current, messageId]);
    await liveKit.publishData({
      type: "chat.pin",
      messageId,
      isPinned: !isPinned,
    }).catch(() => {});
  };

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
              isEnded={isEnded}
              isPlaying={isPlaying}
              isSettingsOpen={isSettingsOpen}
              isMuted={isMuted}
              shouldSave={shouldSave}
              videoTrack={liveKit.videoTrack}
              audioTrack={liveKit.audioTrack}
              playbackUrl={playbackUrl}
              isCameraStarting={isStarting || isRestoringHost || liveKit.isConnecting}
              isEnding={isEnding}
              viewerCount={formatCompactCount(viewerCount)}
              likesCount={formatCompactCount(likesCount)}
              onTogglePlaying={handleTogglePlaying}
              onToggleSettings={() => setIsSettingsOpen((current) => !current)}
              onToggleMuted={handleToggleMuted}
              onToggleSave={handleToggleSave}
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
