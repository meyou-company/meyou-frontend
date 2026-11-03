import { useEffect, useRef, useState } from 'react';
import profileIcons from '../../constants/profileIcons';
import { useVideoViewRegistration } from '../../hooks/useVideoViewRegistration';
import { resolveVideoCardThumbnail } from '../../utils/videoThumbnail';
import './VideoPlayerModal.scss';

export default function VideoPlayerModal({
  video,
  isOpen,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  isAuthorFollowed = false,
  onFollowAuthor,
  onOpenAuthor,
  isAuthed,
  currentUserId,
  onViewRecorded,
  onToggleLike,
  onToggleSave,
  likeLoadingId,
  saveLoadingId,
  canDelete = false,
  onDeleteRequest,
}) {
  const videoRef = useRef(null);
  const [posterUrl, setPosterUrl] = useState(undefined);
  const [isMobileVideo, setIsMobileVideo] = useState(
    () => window.matchMedia('(max-width: 550px)').matches
  );
  const touchStart = useRef(null);
  const authorId = video?.raw?.author?.id ?? video?.authorId ?? null;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 550px)');

    const handleChange = (e) => {
      setIsMobileVideo(e.matches);
      touchStart.current = null;
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleTouchStart = (e) => {
    if (!isMobileVideo) return;
    const touch = e.touches?.[0];

    if (!touch) return;

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (e) => {
    if (!isMobileVideo) {
      touchStart.current = null;
      return;
    }
    const start = touchStart.current;
    const touch = e.changedTouches?.[0];

    touchStart.current = null;

    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    const isVerticalSwipe = Math.abs(deltaY) >= 48 && Math.abs(deltaY) > Math.abs(deltaX);

    if (!isVerticalSwipe) return;

    if (deltaY < 0) {
      if (hasNext) {
        onNext?.();
      }
    } else if (hasPrev) {
      onPrev?.();
    }
  };

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
    document.body.style.overflow = 'hidden';

    const onEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onEscape);

    const playTimer = window.setTimeout(() => {
      videoRef.current?.play()?.catch(() => {});
    }, 0);

    return () => {
      window.removeEventListener('keydown', onEscape);
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
      aria-label={video.title || 'Видео'}
    >
      <div className="videoPlayerModal__backdrop" onClick={onClose} />

      <div
        className="videoPlayerModal__panel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="videoPlayerModal__head">
          <div className="videoPlayerModal__meta">
            <h2 className="videoPlayerModal__title">{video.title || video.name || 'Видео'}</h2>
            {video.name && video.title && (
              <div className="videoPlayerModal__authorRow">
                <p className="videoPlayerModal__author">{video.name}</p>
                {!isAuthorFollowed && String(video.authorId) !== String(currentUserId) && (
                  <button
                    type="button"
                    className="videoPlayerModal__follow--text"
                    onClick={(e) => onFollowAuthor?.(e, video)}
                    aria-label="Підписатися на автора"
                  >
                    Підписатись
                  </button>
                )}
              </div>
            )}
            {video.location && <p className="videoPlayerModal__location">{video.location}</p>}
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
        <button
          type="button"
          className="videoPlayerModal__back"
          onClick={onClose}
          aria-label="Повернутися до відео"
        >
          <img
            className="videoPlayerModal__back-icon"
            alt="Назад"
            src="/icon-black/arrow-left.svg"
          ></img>
        </button>
        <video
          ref={videoRef}
          className="videoPlayerModal__player"
          src={video.videoUrl}
          poster={posterUrl}
          controls
          playsInline
          autoPlay
        />
        <div className="videoPlayerModal__mobileInfo">
          <div className="videoPlayerModal__mobileAuthorRow">
            {video.name && <p className="videoPlayerModal__mobileAuthor">{video.name}</p>}
            {!isAuthorFollowed && String(video.authorId) !== String(currentUserId) && (
              <button
                type="button"
                className="videoPlayerModal__follow--text"
                onClick={(e) => onFollowAuthor?.(e, video)}
                aria-label="Підписатися на автора"
              >
                Підписатись
              </button>
            )}
          </div>
          {video.title && <h2 className="videoPlayerModal__mobileTitle">{video.title}</h2>}

          {/* {video.location && <p className="videoPlayerModal__mobileLocation">{video.location}</p>} */}
        </div>

        <div className="videoPlayerModal__mobileActions">
          <div className="videoPlayerModal__author">
            <button
              type="button"
              className="videoPlayerModal__authorAvatar"
              onClick={() => onOpenAuthor?.(video.authorUsername)}
              aria-label="Відкрити профіль автора"
              disabled={!video.authorUsername}
            >
              {video.avatarUrl ? (
                <img src={video.avatarUrl} alt="" />
              ) : (
                <span>{video.name?.charAt(0) || '?'}</span>
              )}
            </button>

            {!isAuthorFollowed && String(video.authorId) !== String(currentUserId) && (
              <button
                type="button"
                className="videoPlayerModal__follow--cicle"
                onClick={(e) => onFollowAuthor?.(e, video)}
                aria-label="Підписатися на автора"
              >
                +
              </button>
            )}
          </div>
          <button
            type="button"
            className={`videoPlayerModal__action ${video.isLikedByMe ? 'active' : ''}`}
            onClick={(e) => onToggleLike?.(e, video)}
            disabled={likeLoadingId === video.id}
            aria-label={video.isLikedByMe ? 'Убрать лайк' : 'Поставить лайк'}
            aria-pressed={video.isLikedByMe}
          >
            <img src={profileIcons.heartVideo} alt="" />
            <span>{video.likes}</span>
          </button>

          <button
            type="button"
            className={`videoPlayerModal__action ${video.isSavedByMe ? 'active' : ''}`}
            onClick={(e) => onToggleSave?.(e, video)}
            disabled={saveLoadingId === video.id}
            aria-label={video.isSavedByMe ? 'Убрать из сохранённых' : 'Сохранить видео'}
            aria-pressed={video.isSavedByMe}
          >
            <img src={profileIcons.savedPost} alt="" />
          </button>
        </div>
      </div>
    </div>
  );
}
