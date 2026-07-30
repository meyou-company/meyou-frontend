import { useEffect, useRef } from "react";

const REACTIONS = ["❤️", "😁", "😘", "😍", "👀", "👋", "🎁", "🌹"];

function LiveStatus({ elapsed }) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="liveStage__status" aria-label="Эфир идёт">
      <span className="liveStage__recordDot" aria-hidden="true" />
      <strong>LIVE</strong>
      <span aria-hidden="true">•</span>
      <span>{minutes}:{String(seconds).padStart(2, "0")}</span>
    </div>
  );
}

function OwnerSettings({
  isMuted,
  shouldSave,
  onToggleMuted,
  onToggleSave,
  onMention,
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

      <div className="liveStage__settingRow">
        <span>Сохранить эфир</span>
        <button
          type="button"
          className={`liveStage__switch ${shouldSave ? "liveStage__switch--active" : ""}`}
          onClick={onToggleSave}
          aria-label="Сохранить эфир"
          aria-pressed={shouldSave}
        >
          <span />
        </button>
      </div>

      <button type="button" className="liveStage__settingAction" onClick={onMention}>
        <span>Отметить людей</span>
        <span aria-hidden="true">⌄</span>
      </button>

      <button type="button" className="liveStage__settingAction" onClick={onShare}>
        <span>Где поделиться</span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}

export default function LiveStage({
  isOwner,
  host,
  elapsed,
  isEnded,
  isPlaying,
  isSettingsOpen,
  isMuted,
  shouldSave,
  localStream,
  isCameraStarting,
  viewerCount,
  likesCount,
  onTogglePlaying,
  onToggleSettings,
  onToggleMuted,
  onToggleSave,
  onStartCamera,
  onMention,
  onShare,
  onReact,
  onOpenChat,
  onEnd,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = localStream || null;
  }, [localStream]);

  return (
    <section className={`liveStage ${isOwner ? "liveStage--owner" : "liveStage--viewer"}`}>
      <div className="liveStage__top">
        <div className="liveStage__host">
          <img className="liveStage__hostAvatar" src={host.avatar} alt="" />
          <div>
            <span className="liveStage__speaker">●))&nbsp; спикер</span>
            <strong>{host.name}</strong>
            {!isOwner && (
              <span className="liveStage__hostStats">
                <span>◉ {viewerCount}</span>
                <span>♥ {likesCount}</span>
              </span>
            )}
          </div>
        </div>

        <div className="liveStage__topRight">
          {!isEnded && <LiveStatus elapsed={elapsed} />}
          {isOwner && !isEnded && (
            <button
              type="button"
              className="liveStage__settingsButton"
              onClick={onToggleSettings}
              aria-label="Настройки эфира"
              aria-expanded={isSettingsOpen}
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {isOwner && isSettingsOpen && !isEnded && (
        <OwnerSettings
          isMuted={isMuted}
          shouldSave={shouldSave}
          onToggleMuted={onToggleMuted}
          onToggleSave={onToggleSave}
          onMention={onMention}
          onShare={onShare}
        />
      )}

      <div className="liveStage__center">
        {isEnded ? (
          <div className="liveStage__ended">
            <strong>Эфир завершён</strong>
            <span>Сегодня · трансляция окончена</span>
            <span>⏱ {Math.max(1, Math.floor(elapsed / 60))} мин</span>
          </div>
        ) : !isOwner ? (
          <button
            type="button"
            className={`liveStage__play ${isPlaying ? "liveStage__play--playing" : ""}`}
            onClick={onTogglePlaying}
            aria-label={isPlaying ? "Поставить на паузу" : "Смотреть эфир"}
          >
            <span>{isPlaying ? "Ⅱ" : "▶"}</span>
          </button>
        ) : localStream ? (
          <video
            ref={videoRef}
            className="liveStage__cameraPreview"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <button
            type="button"
            className="liveStage__cameraStart"
            onClick={onStartCamera}
            disabled={isCameraStarting}
          >
            {isCameraStarting ? "Подключение..." : "Включить камеру"}
          </button>
        )}
      </div>

      <div className="liveStage__bottom">
        {isOwner ? (
          <>
            <div className="liveStage__metrics">
              <span>◉ {viewerCount}</span>
              <span>♥ {likesCount}</span>
            </div>

            <div className="liveStage__ownerActions">
              {!isEnded && (
                <button
                  type="button"
                  className="liveStage__stopButton"
                  onClick={onEnd}
                  aria-label="Завершить трансляцию"
                >
                  <span />
                </button>
              )}
              <div>
                <button type="button" className="liveStage__outlineButton" onClick={onOpenChat}>
                  Перейти в чат
                </button>
                {!isEnded && (
                  <button type="button" className="liveStage__outlineButton" onClick={onEnd}>
                    Завершить трансляцию
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="liveStage__reactions" aria-label="Реакции">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  type="button"
                  onClick={() => onReact(reaction)}
                  aria-label={`Отправить реакцию ${reaction}`}
                >
                  {reaction}
                </button>
              ))}
            </div>
            <button type="button" className="liveStage__outlineButton" onClick={onOpenChat}>
              Написать сообщение
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export { REACTIONS };
