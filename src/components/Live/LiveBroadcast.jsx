import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../zustand/useAuthStore";
import profileIcons from "../../constants/profileIcons";
import LiveHeader from "./LiveHeader";
import LiveStage from "./LiveStage";
import LiveChat from "./LiveChat";
import "./LiveBroadcast.scss";

const DEFAULT_AVATAR = "/Logo/photo.png";

function getDisplayName(user) {
  return (
    user?.name ||
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Пользователь"
  );
}

function formatCompactCount(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(".", ",")}K`;
  }

  return String(value);
}

export default function LiveBroadcast() {
  const navigate = useNavigate();
  const location = useLocation();
  const { liveId } = useParams();
  const authUser = useAuthStore((state) => state.user);
  const chatRef = useRef(null);

  const isOwner = location.state?.mode
    ? location.state.mode === "owner"
    : !liveId;

  const currentUser = useMemo(
    () => ({
      id: authUser?.id || authUser?.userId || "current-user",
      name: getDisplayName(authUser),
      avatar:
        authUser?.avatarUrl ||
        authUser?.avatar ||
        authUser?.photoUrl ||
        DEFAULT_AVATAR,
    }),
    [authUser],
  );

  const host = useMemo(() => {
    if (isOwner) return currentUser;

    const routeHost = location.state?.host;
    if (!routeHost) {
      return {
        id: "demo-host",
        name: "Sandra Sandra",
        avatar: DEFAULT_AVATAR,
      };
    }

    return {
      id: routeHost?.id || "demo-host",
      name: getDisplayName(routeHost),
      avatar:
        routeHost?.avatarUrl ||
        routeHost?.avatar ||
        DEFAULT_AVATAR,
    };
  }, [currentUser, isOwner, location.state]);

  const [elapsed, setElapsed] = useState(27 * 60 + 34);
  const [isEnded, setIsEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(isOwner);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldSave, setShouldSave] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [viewerCount] = useState(2500);
  const [likesCount, setLikesCount] = useState(2200);
  const [pinnedMessageId, setPinnedMessageId] = useState("welcome");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      authorId: "anna",
      authorName: "Анна",
      avatar: DEFAULT_AVATAR,
      text: "Привет! Рада быть на прямом эфире.",
    },
  ]);

  useEffect(() => {
    if (isEnded) return undefined;

    const intervalId = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isEnded]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted, localStream]);

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [localStream]);

  const handleSend = (messageText) => {
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${currentUser.id}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        avatar: currentUser.avatar,
        text: messageText,
      },
    ]);
  };

  const handleReact = (reaction) => {
    setLikesCount((current) => current + 1);
    toast.success(`Реакция ${reaction} отправлена`);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/live/${liveId || "demo"}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Прямой эфир ${host.name}`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Ссылка на эфир скопирована");
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error("Не удалось поделиться эфиром");
      }
    }
  };

  const handleEnd = () => {
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setIsEnded(true);
    setIsPlaying(false);
    setIsSettingsOpen(false);
    toast.success(shouldSave ? "Эфир завершён и сохранён" : "Эфир завершён");
  };

  const handleStartCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Камера недоступна в этом браузере");
      return;
    }

    try {
      setIsCameraStarting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setIsMuted(false);
    } catch {
      toast.error("Не удалось получить доступ к камере и микрофону");
    } finally {
      setIsCameraStarting(false);
    }
  };

  const handleModerate = (action, message) => {
    const labels = {
      block: `${message.authorName} заблокирован`,
      report: "Жалоба отправлена",
    };
    toast.success(labels[action]);
  };

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate(isOwner ? "/profile" : "/first-page");
  };

  return (
    <main className="livePage">
      <LiveHeader />

      <div className="livePage__background" aria-hidden="true" />

      <div className="livePage__content">
        <button
          type="button"
          className="livePage__back"
          onClick={handleBack}
          aria-label="Назад"
        >
          <img src={profileIcons.storyBack} alt="" />
        </button>

        <h1>Прямой эфир</h1>

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
            localStream={localStream}
            isCameraStarting={isCameraStarting}
            viewerCount={formatCompactCount(viewerCount)}
            likesCount={formatCompactCount(likesCount)}
            onTogglePlaying={() => setIsPlaying((current) => !current)}
            onToggleSettings={() => setIsSettingsOpen((current) => !current)}
            onToggleMuted={() => setIsMuted((current) => !current)}
            onToggleSave={() => setShouldSave((current) => !current)}
            onStartCamera={handleStartCamera}
            onMention={() => toast.info("Выбор участников будет доступен после подключения API эфиров")}
            onShare={handleShare}
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
            onPin={(messageId) => setPinnedMessageId((current) =>
              current === messageId ? null : messageId
            )}
            onDelete={(messageId) => {
              setMessages((current) => current.filter((item) => item.id !== messageId));
              setPinnedMessageId((current) => current === messageId ? null : current);
            }}
            onReply={() => {}}
            onModerate={handleModerate}
          />
        </div>
      </div>
    </main>
  );
}
