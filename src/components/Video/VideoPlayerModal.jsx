import { useEffect, useRef, useState } from "react";
import profileIcons from "../../constants/profileIcons";
import { useVideoViewRegistration } from "../../hooks/useVideoViewRegistration";
import { resolveVideoCardThumbnail } from "../../utils/videoThumbnail";
import "./VideoPlayerModal.scss";

export default function VideoPlayerModal({
  video,
  isOpen,
  onClose,
  isAuthed,
  currentUserId,
  onViewRecorded,
  canDelete = false,
  onDeleteRequest,
}) {
  const videoRef = useRef(null);
  const [posterUrl, setPosterUrl] = useState(undefined);

  const authorId = video?.raw?.author?.id ?? video?.authorId ?? null;

  useVideoViewRegistration({
    videoRef,
    videoId: video?.id,
    authorId,
    currentUserId,
    isAuthed,
    isActive: isOpen,
    onViewRecorded,
  });

  useEffect(() => {
    if (!isOpen || !video) {
      setPosterUrl(undefined);
      return undefined;
    }

    let cancelled = false;

    resolveVideoCardThumbnail(video.thumbnailUrl, video.videoUrl).then((url) => {
      if (!cancelled) setPosterUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, video?.id, video?.thumbnailUrl, video?.videoUrl]);

  useEffect(() => {
    if (!isOpen || !video?.videoUrl) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onEscape);

    const playTimer = window.setTimeout(() => {
      videoRef.current?.play()?.catch(() => {});
    }, 0);

    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousBodyOverflow;
      window.clearTimeout(playTimer);
      videoRef.current?.pause();
    };
  }, [isOpen, video?.id, video?.videoUrl, onClose]);

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

          <div className="videoPlayerModal__actions">
            {canDelete && (
              <button
                type="button"
                className="videoPlayerModal__delete"
                onClick={onDeleteRequest}
                aria-label="Удалить видео"
              >
                Удалить
              </button>
            )}

            <button
              type="button"
              className="videoPlayerModal__close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <img src={profileIcons.close} alt="" />
            </button>
          </div>
        </div>

        <video
          ref={videoRef}
          className="videoPlayerModal__player"
          src={video.videoUrl}
          poster={posterUrl}
          controls
          playsInline
          autoPlay
        />
      </div>
    </div>
  );
}
