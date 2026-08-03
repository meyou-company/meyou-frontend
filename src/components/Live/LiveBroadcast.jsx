import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useLiveKitBroadcast } from "../../hooks/useLiveKitBroadcast";
import { extractLiveMedia, liveStreamsApi } from "../../services/liveStreamsApi";
import { usersApi } from "../../services/usersApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import profileIcons from "../../constants/profileIcons";
import LiveHeader from "./LiveHeader";
import LiveStage from "./LiveStage";
import LiveChat from "./LiveChat";
import LiveUserPicker from "./LiveUserPicker";
import "./LiveBroadcast.scss";

const DEFAULT_AVATAR = "/Logo/photo.png";
const LIVE_STATUS = "LIVE";
const ENDED_STATUS = "ENDED";

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
  const host = value.host || value.author || value.user || value.owner || {};
  return {
    ...value,
    id: value.id || value._id,
    status: String(value.status || "SCHEDULED").toUpperCase(),
    host,
    hostId: value.hostId || value.authorId || value.userId || getUserId(host),
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
    authorId: value.authorId || value.userId || value.senderId || getUserId(author),
    authorName: value.authorName || getDisplayName(author),
    avatar:
      value.avatar || author.avatarUrl || author.avatar || author.photoUrl || DEFAULT_AVATAR,
    text: String(value.text || value.message || value.content || ""),
    createdAt: value.createdAt || value.created_at || new Date().toISOString(),
    isPersisted: Boolean(id),
  };
}

function appendUniqueMessage(list, message) {
  if (!message?.id || list.some((item) => item.id === message.id)) return list;
  return [...list, message];
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

export default function LiveBroadcast() {
  const navigate = useNavigate();
  const location = useLocation();
  const { liveId } = useParams();
  const authUser = useAuthStore((state) => state.user);
  const chatRef = useRef(null);
  const streamRef = useRef(null);

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(!liveId);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldSave, setShouldSave] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [pinnedMessageId, setPinnedMessageId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);

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

  const host = useMemo(() => {
    if (isOwner) return currentUser;
    const source = stream?.host || location.state?.host || {};
    return {
      id: getUserId(source) || stream?.hostId || "live-host",
      name: getDisplayName(source),
      avatar:
        source.avatarUrl || source.avatar || source.photoUrl || DEFAULT_AVATAR,
    };
  }, [currentUser, isOwner, location.state, stream]);

  const handleRoomData = useCallback((packet) => {
    switch (packet?.type) {
      case "chat.message": {
        const message = normalizeMessage(packet.message);
        setMessages((current) => appendUniqueMessage(current, message));
        break;
      }
      case "chat.delete":
        setMessages((current) => current.filter((item) => item.id !== packet.messageId));
        setPinnedMessageId((current) =>
          current === packet.messageId ? null : current,
        );
        break;
      case "chat.pin":
        setPinnedMessageId(packet.messageId || null);
        break;
      case "reaction":
        setLikesCount((current) => current + 1);
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

  useEffect(() => {
    if (!liveId) {
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    Promise.all([
      liveStreamsApi.getById(liveId),
      liveStreamsApi.getMessages(liveId).catch(() => ({ items: [] })),
    ])
      .then(async ([streamPayload, messagePayload]) => {
        if (cancelled) return;
        const normalized = setStream(streamPayload);
        setIsEnded(normalized.status === ENDED_STATUS);
        setIsMuted(!normalized.isSoundEnabled);
        setShouldSave(normalized.isSaved);
        setLikesCount(normalized.reactionsCount);
        setMessages(
          messagePayload.items
            .map(normalizeMessage)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        );

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
        if (!cancelled) setLoadError(getApiErrorMessage(error, "errors.generic"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [liveId, setStream]);

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

  const handleStartBroadcast = async () => {
    if (isStarting || liveKit.isConnecting) return;

    let startedStreamId = null;
    try {
      setIsStarting(true);
      let target = stream;

      if (!target?.id) {
        try {
          target = normalizeStream(await liveStreamsApi.create({
            title: `Прямой эфир ${currentUser.name}`,
          }));
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

      const startedPayload = await liveStreamsApi.start(target.id);
      const started = setStream({ ...target, ...startedPayload, status: LIVE_STATUS });
      startedStreamId = started.id;
      await liveKit.connect(extractLiveMedia(startedPayload), { isHost: true });
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
        const failedStream = streamRef.current;
        setStream(failedStream?.id === startedStreamId
          ? { ...failedStream, status: ENDED_STATUS }
          : failedStream);
        setIsEnded(true);
      }
      toast.error(getApiErrorMessage(error, "errors.generic"));
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
      toast.error(getApiErrorMessage(error, "errors.generic"));
    }
  };

  const handleSend = async (messageText) => {
    let pendingMessage = null;
    try {
      if (!liveKit.isConnected) await ensureViewerConnected();
      pendingMessage = {
        id: crypto.randomUUID?.() || `${Date.now()}-${currentUser.id}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        avatar: currentUser.avatar,
        text: messageText,
        createdAt: new Date().toISOString(),
        isPersisted: false,
      };
      setMessages((current) => appendUniqueMessage(current, pendingMessage));
      await liveKit.publishData({ type: "chat.message", message: pendingMessage });
    } catch (error) {
      if (pendingMessage) {
        setMessages((current) => current.filter((item) => item.id !== pendingMessage.id));
      }
      toast.error(getApiErrorMessage(error, "errors.generic"));
      throw error;
    }
  };

  const handleReact = async (reaction) => {
    try {
      if (!liveKit.isConnected) await ensureViewerConnected();
      await liveKit.publishData({
        type: "reaction",
        reaction,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
      }, { reliable: false });
      setLikesCount((current) => current + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
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
      toast.error(getApiErrorMessage(error, "errors.generic"));
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
      toast.error(getApiErrorMessage(error, "errors.generic"));
    }
  };

  const handleEnd = async () => {
    if (!isOwner || !stream?.id) return;
    try {
      await liveKit.publishData({ type: "stream.ended" }).catch(() => {});
      const endedPayload = await liveStreamsApi.end(stream.id, {});
      await liveKit.disconnect();
      setStream({ ...stream, ...endedPayload, status: ENDED_STATUS });
      setIsEnded(true);
      setIsPlaying(false);
      setIsSettingsOpen(false);
      toast.success(shouldSave ? "Эфир завершён, запись обрабатывается" : "Эфир завершён");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!stream?.id) return;
    try {
      if (message.isPersisted) {
        await liveStreamsApi.deleteMessage(stream.id, message.id);
      }
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setPinnedMessageId((current) => current === message.id ? null : current);
      await liveKit.publishData({ type: "chat.delete", messageId: message.id }).catch(() => {});
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
    }
  };

  const handlePinMessage = async (messageId) => {
    const nextId = pinnedMessageId === messageId ? null : messageId;
    setPinnedMessageId(nextId);
    await liveKit.publishData({ type: "chat.pin", messageId: nextId }).catch(() => {});
  };

  const handleModerate = async (action, message) => {
    try {
      if (action === "block") {
        await usersApi.blockUser(message.authorId);
        toast.success(`${message.authorName} заблокирован`);
      } else {
        await usersApi.reportUser(message.authorId, "LIVE_STREAM_CHAT");
        toast.success("Жалоба отправлена");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "errors.generic"));
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

  const viewerCount = liveKit.participantCount > 0
    ? Math.max(0, liveKit.participantCount - 1)
    : stream?.viewersCount || 0;

  return (
    <main className="livePage">
      <LiveHeader />
      <div className="livePage__background" aria-hidden="true" />

      <div className="livePage__content">
        <button type="button" className="livePage__back" onClick={handleBack} aria-label="Назад">
          <img src={profileIcons.storyBack} alt="" />
        </button>

        <h1>{stream?.title || "Прямой эфир"}</h1>

        {isLoading ? <div className="livePage__state">Загрузка эфира...</div> : null}
        {!isLoading && loadError ? (
          <div className="livePage__state livePage__state--error">
            <p>{loadError}</p>
            <button type="button" onClick={handleBack}>Вернуться</button>
          </div>
        ) : null}

        {!isLoading && !loadError ? (
          <div className="livePage__broadcastLayout">
            <LiveStage
              isOwner={isOwner}
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
              isCameraStarting={isStarting || liveKit.isConnecting}
              viewerCount={formatCompactCount(viewerCount)}
              likesCount={formatCompactCount(likesCount)}
              onTogglePlaying={handleTogglePlaying}
              onToggleSettings={() => setIsSettingsOpen((current) => !current)}
              onToggleMuted={handleToggleMuted}
              onToggleSave={handleToggleSave}
              onStartCamera={handleStartBroadcast}
              onMention={() => stream?.id ? setPickerMode("tag") : toast.info("Сначала запустите эфир")}
              onShare={() => stream?.id ? setPickerMode("share") : toast.info("Сначала запустите эфир")}
              onReact={handleReact}
              onOpenChat={() => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              onEnd={handleEnd}
            />

            <LiveChat
              ref={chatRef}
              isOwner={isOwner}
              currentUser={currentUser}
              messages={messages}
              pinnedMessageId={pinnedMessageId}
              isEnded={isEnded}
              onSend={handleSend}
              onReact={handleReact}
              onPin={handlePinMessage}
              onDelete={handleDeleteMessage}
              onReply={() => {}}
              onModerate={handleModerate}
            />
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
