import { useEffect, useRef } from "react";
import profileIcons from "../../constants/profileIcons";
import { videosApi } from "../../services/videosApi";
import "./VideoPlayerModal.scss";

export default function VideoPlayerModal({ video, isOpen, onClose, isAuthed }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !video?.videoUrl) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onEscape);

    if (isAuthed && video.id) {
      videosApi.registerView(video.id).catch(() => {});
    }

    const playTimer = window.setTimeout(() => {
      videoRef.current?.play()?.catch(() => {});
    }, 0);

    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousBodyOverflow;
      window.clearTimeout(playTimer);
      videoRef.current?.pause();
    };
  }, [isOpen, video?.id, video?.videoUrl, isAuthed, onClose]);

  if (!isOpen || !video?.videoUrl) return null;

  return (
    <div
      className="videoPlayerModal"
      role="dialog"
      aria-modal="true"
      aria-label={video.title || "Видео"}
    >
      <div className="videoPlayerModal__backdrop" onClick={onClose} />

      <div className="videoPlayerModal__panel">
        <div className="videoPlayerModal__head">
          <div className="videoPlayerModal__meta">
            <h2 className="videoPlayerModal__title">
              {video.title || video.name || "Видео"}
            </h2>
            {video.name && video.title && (
              <p className="videoPlayerModal__author">{video.name}</p>
            )}
            {video.location && (
              <p className="videoPlayerModal__location">{video.location}</p>
            )}
          </div>

          <button
            type="button"
            className="videoPlayerModal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <img src={profileIcons.close} alt="" />
          </button>
        </div>

        <video
          ref={videoRef}
          className="videoPlayerModal__player"
          src={video.videoUrl}
          poster={video.image !== "/foon2.png" ? video.image : undefined}
          controls
          playsInline
          autoPlay
        />
      </div>
    </div>
  );
}
