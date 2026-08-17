import { useEffect, useRef } from "react";
import profileIcons from "../../constants/profileIcons";

const REACTIONS = [
  { value: "❤️", icon: profileIcons.liveReactionHeart, label: "Сердце" },
  { value: "😁", content: "😁", label: "Улыбка" },
  { value: "😘", icon: profileIcons.liveReactionKiss, label: "Поцелуй" },
  { value: "😍", content: "😍", label: "Влюблённость" },
  { value: "👀", content: "👀", label: "Глаза" },
  { value: "👏", icon: profileIcons.liveReactionClap, label: "Аплодисменты" },
  { value: "🎁", content: "🎁", label: "Подарок" },
  { value: "🌹", content: "🌹", label: "Роза" },
];

function ReactionContent({ reaction }) {
  return reaction.icon
    ? <img src={reaction.icon} alt="" />
    : <span aria-hidden="true">{reaction.content}</span>;
}

function LiveStatus({ elapsed }) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="liveStage__status" aria-label="Эфир идёт">
      <img className="liveStage__recordDot" src={profileIcons.liveRecord} alt="" />
      <strong>LIVE</strong>
      <span aria-hidden="true">•</span>
      <span>{minutes}:{String(seconds).padStart(2, "0")}</span>
    </div>
  );
}

function OwnerSettings({
  isMuted,
  onToggleMuted,
  onShare,
}) {
  return (
    <div className="liveStage__settingsPanel">
      <div className="liveStage__settingRow">
        <span>Звук</span>
        <button
          type="button"
          className={`liveStage__switch ${!isMuted ? "liveStage__switch--active" : ""}`}
          onClick={onToggleMuted}
          aria-label={isMuted ? "Включить звук" : "Выключить звук"}
          aria-pressed={!isMuted}
        >
          <span />
        </button>
      </div>

      <button type="button" className="liveStage__settingAction" onClick={onShare}>
        <span>Где поделиться</span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}

export default function LiveStage({
  isOwner,
  isLive,
  host,
  elapsed,
  endedDateLabel,
  endedDurationLabel,
  isEnded,
  isPlaying,
  isSettingsOpen,
  isMuted,
  videoTrack,
  audioTrack,
  isCameraStarting,
  isEnding,
  viewerCount,
  likesCount,
  onTogglePlaying,
  onToggleSettings,
  onToggleMuted,
  onStartCamera,
  onShare,
  onReact,
  isChatOpen,
  onToggleChat,
  onEnd,
  onOpenHostProfile,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !videoTrack) return undefined;
    videoTrack.attach(element);
    return () => videoTrack.detach(element);
  }, [videoTrack]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !audioTrack || isOwner) return undefined;
    audioTrack.attach(element);
    return () => audioTrack.detach(element);
  }, [audioTrack, isOwner]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || isOwner) return;
    if (isPlaying) {
      element.play().catch(() => {});
    } else {
      element.pause();
    }
  }, [isOwner, isPlaying, videoTrack]);

  const hasVideo = Boolean(videoTrack);

  return (
    <section className={`liveStage ${isOwner ? "liveStage--owner" : "liveStage--viewer"}`}>
      <div className="liveStage__top">
        <button
          type="button"
          className="liveStage__host"
          onClick={onOpenHostProfile}
          aria-label={`Открыть профиль ${host.name}`}
        >
          <img
            className="liveStage__hostAvatar"
            src={host.avatar || profileIcons.userStory}
            alt=""
            onError={(event) => {
              if (event.currentTarget.src.endsWith(profileIcons.userStory)) return;
              event.currentTarget.src = profileIcons.userStory;
            }}
          />
          <div className="liveStage__hostInfo">
            <img
              className="liveStage__speakerIcon"
              src={profileIcons.liveSpeaker}
              alt=""
              aria-hidden="true"
            />
            <span className="liveStage__speakerLabel">спикер</span>
            <strong>{host.name}</strong>
            {!isOwner && (
              <span className="liveStage__hostStats">
                <span><img src={profileIcons.liveEye} alt="" /> {viewerCount}</span>
                <span><img src={profileIcons.liveReactionHeart} alt="" /> {likesCount}</span>
              </span>
            )}
          </div>
        </button>

        <div className="liveStage__topRight">
          {isLive && !isEnded && <LiveStatus elapsed={elapsed} />}
          {isOwner && !isEnded && (
            <button
              type="button"
              className="liveStage__settingsButton"
              onClick={onToggleSettings}
              aria-label="Настройки эфира"
              aria-expanded={isSettingsOpen}
            >
              <img src={profileIcons.liveSettings} alt="" />
            </button>
          )}
        </div>
      </div>

      {isOwner && isSettingsOpen && !isEnded && (
        <OwnerSettings
          isMuted={isMuted}
          onToggleMuted={onToggleMuted}
          onShare={onShare}
        />
      )}

      <div className="liveStage__center">
        {hasVideo && (
          <video
            ref={videoRef}
            className="liveStage__cameraPreview"
            autoPlay
            muted={isOwner}
            playsInline
          />
        )}
        <audio ref={audioRef} autoPlay className="liveStage__remoteAudio" />

        {isEnded ? (
          <div className="liveStage__ended">
            <strong>Эфир завершён</strong>
            <span>{endedDateLabel ? `${endedDateLabel} · ` : ""}трансляция окончена</span>
            <span>⏱ {endedDurationLabel}</span>
          </div>
        ) : !isOwner && (!videoTrack || !isPlaying) ? (
          <button
            type="button"
            className={`liveStage__play ${isPlaying ? "liveStage__play--playing" : ""}`}
            onClick={onTogglePlaying}
            aria-label={isPlaying ? "Поставить на паузу" : "Смотреть эфир"}
          >
            <span>{isPlaying ? "Ⅱ" : "▶"}</span>
          </button>
        ) : isOwner && !isLive && !isEnded ? (
          <button
            type="button"
            className="liveStage__cameraStart"
            onClick={onStartCamera}
            disabled={isCameraStarting}
          >
            {isCameraStarting ? "Запуск..." : "Начать эфир"}
          </button>
        ) : null}
      </div>

      <div className="liveStage__bottom">
        {isOwner ? (
          <>
            <div className="liveStage__metrics">
              <span><img src={profileIcons.liveEye} alt="" /> {viewerCount}</span>
              <span><img src={profileIcons.liveReactionHeart} alt="" /> {likesCount}</span>
            </div>

            <div className="liveStage__ownerActions">
              <div>
                <button type="button" className="liveStage__outlineButton" onClick={onToggleChat}>
                  {isChatOpen ? "Закрыть чат" : "Открыть чат"}
                </button>
                {isLive && !isEnded && (
                  <div className="liveStage__endControl">
                    <button
                      type="button"
                      className="liveStage__outlineButton liveStage__endButton"
                      onClick={onEnd}
                      disabled={isEnding}
                    >
                      <img src={profileIcons.liveStop} alt="" aria-hidden="true" />
                      <span>{isEnding ? "Завершение..." : "Завершить трансляцию"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="liveStage__reactions" aria-label="Реакции">
              {REACTIONS.slice(0, 1).map((reaction) => (
                <button
                  key={reaction.value}
                  type="button"
                  onClick={() => onReact(reaction.value)}
                  aria-label={`Отправить реакцию ${reaction.label}`}
                >
                  <ReactionContent reaction={reaction} />
                </button>
              ))}
            </div>
            <button type="button" className="liveStage__outlineButton" onClick={onToggleChat}>
              {isChatOpen ? "Закрыть чат" : "Открыть чат"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export { REACTIONS };
