import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuSwitchCamera } from "react-icons/lu";
import profileIcons from "../../constants/profileIcons";

const REACTIONS = [
  { value: "❤️", icon: profileIcons.liveReactionHeart, label: "live.heart" },
  { value: "😁", content: "😁", label: "live.smile" },
  { value: "😘", icon: profileIcons.liveReactionKiss, label: "live.kiss" },
  { value: "😍", content: "😍", label: "live.love" },
  { value: "👀", content: "👀", label: "live.eyes" },
  { value: "👏", icon: profileIcons.liveReactionClap, label: "live.applause" },
  { value: "🎁", content: "🎁", label: "live.gift" },
  { value: "🌹", content: "🌹", label: "live.rose" },
];

function ReactionContent({ reaction }) {
  return reaction.icon
    ? <img src={reaction.icon} alt="" />
    : <span aria-hidden="true">{reaction.content}</span>;
}

function LiveStatus({ elapsed }) {
  const { t } = useTranslation();
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="liveStage__status" aria-label={t("live.inProgress")}>
      <img className="liveStage__recordDot" src={profileIcons.liveRecord} alt="" />
      <strong>LIVE</strong>
      <span aria-hidden="true" className="liveStage__statusSeparator">
        •
      </span>
      <span>{minutes}:{String(seconds).padStart(2, "0")}</span>
    </div>
  );
}

function OwnerSettings({
  isMuted,
  onToggleMuted,
  onShare,
  panelRef,
}) {
  const { t } = useTranslation();
  return (
    <div ref={panelRef} className="liveStage__settingsPanel">
      <div className="liveStage__settingRow">
        <span>{t("live.sound")}</span>
        <button
          type="button"
          className={`liveStage__switch ${!isMuted ? "liveStage__switch--active" : ""}`}
          onClick={onToggleMuted}
          aria-label={isMuted ? t("live.unmute") : t("live.mute")}
          aria-pressed={!isMuted}
        >
          <span />
        </button>
      </div>

      <button type="button" className="liveStage__settingAction" onClick={onShare}>
        <span>{t("live.share")}</span>
        <span className="liveStage__settingActionIcon" aria-hidden="true">
          <img src={profileIcons.storyArrowFilled} alt="" />
        </span>
      </button>
    </div>
  );
}

export default function LiveStage({
  isOwner,
  isLive,
  host,
  elapsed,
  endedPeriodLabel,
  endedDurationLabel,
  isEnded,
  isPlaying,
  isSettingsOpen,
  isMuted,
  videoTrack,
  audioTrack,
  isCameraStarting,
  isSwitchingCamera,
  isEnding,
  viewerCount,
  likesCount,
  onToggleSettings,
  onCloseSettings,
  onToggleMuted,
  onStartCamera,
  onSwitchCamera,
  onShare,
  onReact,
  isChatOpen,
  onToggleChat,
  onEnd,
  onOpenHostProfile,
}) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const settingsPanelRef = useRef(null);

  useEffect(() => {
    if (!isOwner || !isSettingsOpen || isEnded) return;

    const handleOutsidePress = (event) => {
      if (
        settingsPanelRef.current?.contains(event.target) ||
        settingsButtonRef.current?.contains(event.target)
      ) return;

      onCloseSettings();
    };

    document.addEventListener("click", handleOutsidePress, true);
    return () => document.removeEventListener("click", handleOutsidePress, true);
  }, [isOwner, isSettingsOpen, isEnded, onCloseSettings]);

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
      element.play().catch(() => { });
    } else {
      element.pause();
    }
  }, [isOwner, isPlaying, videoTrack]);

  const hasVideo = Boolean(videoTrack);

  return (
    <section
      className={`liveStage ${isOwner ? "liveStage--owner" : "liveStage--viewer"} ${isLive && !isEnded ? "liveStage--active" : ""}`}
    >
      <div className="liveStage__top">
        <button
          type="button"
          className="liveStage__host"
          onClick={onOpenHostProfile}
          aria-label={t("live.openProfile", { name: host.name })}
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
            <span className="liveStage__speakerLabel">{t("live.speaker")}</span>
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
          {isOwner && isLive && !isEnded && hasVideo && (
            <button
              type="button"
              className="liveStage__switchCameraButton"
              onClick={onSwitchCamera}
              disabled={isSwitchingCamera}
              aria-label={t("live.switchCamera")}
              title={t("live.switchCamera")}
            >
              <LuSwitchCamera aria-hidden="true" />
            </button>
          )}
          {isOwner && !isEnded && (
            <button
              type="button"
              className="liveStage__settingsButton"
              ref={settingsButtonRef}
              onClick={onToggleSettings}
              aria-label={t("live.settings")}
              aria-expanded={isSettingsOpen}
            >
              <img src={profileIcons.liveSettings} alt="" />
            </button>
          )}
        </div>
      </div>

      {isOwner && isSettingsOpen && !isEnded && (
        <>
          <div className="liveStage__settingsBackdrop" aria-hidden="true" />
          <OwnerSettings
            panelRef={settingsPanelRef}
            isMuted={isMuted}
            onToggleMuted={onToggleMuted}
            onShare={onShare}
          />
        </>
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
            <strong>{t("live.ended")}</strong>
            <span>{endedPeriodLabel}</span>
            <span>⏱ {endedDurationLabel}</span>
            <Link className="liveStage__cameraStart liveStage__homeLink" to="/first-page" replace>
              {t("profile.goHome")}
            </Link>
          </div>
        ) : isOwner && !isLive && !isEnded ? (
          <button
            type="button"
            className="liveStage__cameraStart"
            onClick={onStartCamera}
            disabled={isCameraStarting}
          >
            {isCameraStarting ? t("live.starting") : t("live.start")}
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
                  {isChatOpen ? t("live.closeChat") : t("live.openChat")}
                </button>
                {isLive && !isEnded && (
                  <div className="liveStage__endControl">
                    <button
                      type="button"
                      className="liveStage__endIconButton"
                      onClick={onEnd}
                      disabled={isEnding}
                      aria-label={t("live.end")}
                    >
                      <img src={profileIcons.liveStop} alt="" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="liveStage__outlineButton liveStage__endButton"
                      onClick={onEnd}
                      disabled={isEnding}
                    >
                      <span>{isEnding ? t("live.ending") : t("live.end")}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="liveStage__reactions" aria-label={t("live.reactions")}>
              {REACTIONS.slice(0, 1).map((reaction) => (
                <button
                  key={reaction.value}
                  type="button"
                  onClick={() => onReact(reaction.value)}
                  aria-label={t("live.sendReaction", { reaction: t(reaction.label) })}
                >
                  <ReactionContent reaction={reaction} />
                </button>
              ))}
            </div>
            <button type="button" className="liveStage__outlineButton" onClick={onToggleChat}>
              {isChatOpen ? t("live.closeChat") : t("live.openChat")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export { REACTIONS };
