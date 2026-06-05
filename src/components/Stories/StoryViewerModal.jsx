import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import profileIcons from "../../constants/profileIcons";
import { storiesApi } from "../../services/storiesApi";
import AppHeader from "../Layout/AppHeader";
import "./StoryViewerModal.scss";

const DEFAULT_DURATION = 500000;

function getStoryId(story) {
  return story?.id || story?._id || story?.storyId || null;
}

function getStoryMediaUrl(story) {
  return story?.mediaUrl || story?.media_url || story?.url || story?.media?.url || "";
}

function getStoryMediaType(story) {
  return String(story?.mediaType || story?.media_type || story?.type || "image").toLowerCase();
}

function getAuthorName(author) {
  return (
    [author?.firstName, author?.lastName].filter(Boolean).join(" ").trim() ||
    author?.username ||
    "User"
  );
}

export default function StoryViewerModal({
  isOpen,
  groups = [],
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  currentUserId,
  onClose,
  onViewed,
  onDeleteStory,
}) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);

  const viewedRef = useRef(new Set());

  const safeGroups = Array.isArray(groups) ? groups : [];

  const currentGroup = safeGroups[groupIndex];
  const stories = Array.isArray(currentGroup?.stories) ? currentGroup.stories : [];
  const currentStory = stories[storyIndex];

  const storyId = getStoryId(currentStory);
  const mediaUrl = getStoryMediaUrl(currentStory);
  const mediaType = getStoryMediaType(currentStory);
  const author = currentGroup?.author || currentStory?.author;
  const authorAvatar = author?.avatarUrl || author?.avatar || profileIcons.userStory;
  const isOwnStory =
    String(author?.id ?? currentStory?.authorId ?? "") === String(currentUserId ?? "");

  const hasStories = safeGroups.length > 0 && stories.length > 0 && currentStory;

  const goNext = useCallback(() => {
    setProgress(0);
    setDuration(DEFAULT_DURATION);

    setStoryIndex((prevStoryIndex) => {
      const currentStories = Array.isArray(safeGroups[groupIndex]?.stories)
        ? safeGroups[groupIndex].stories
        : [];

      if (prevStoryIndex < currentStories.length - 1) {
        return prevStoryIndex + 1;
      }

      if (groupIndex < safeGroups.length - 1) {
        setGroupIndex((prevGroupIndex) => prevGroupIndex + 1);
        return 0;
      }

      onClose?.();
      return prevStoryIndex;
    });
  }, [groupIndex, safeGroups, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setDuration(DEFAULT_DURATION);

    setStoryIndex((prevStoryIndex) => {
      if (prevStoryIndex > 0) return prevStoryIndex - 1;

      if (groupIndex > 0) {
        const prevGroup = safeGroups[groupIndex - 1];
        const prevStories = Array.isArray(prevGroup?.stories) ? prevGroup.stories : [];
        setGroupIndex((prevGroupIndex) => prevGroupIndex - 1);
        return Math.max(prevStories.length - 1, 0);
      }

      return 0;
    });
  }, [groupIndex, safeGroups]);

  useEffect(() => {
    if (!isOpen) return;

    setGroupIndex(initialGroupIndex || 0);
    setStoryIndex(initialStoryIndex || 0);
    setProgress(0);
    setDuration(DEFAULT_DURATION);
  }, [isOpen, initialGroupIndex, initialStoryIndex]);

  useEffect(() => {
    if (!isOpen || !storyId || viewedRef.current.has(storyId)) return;

    viewedRef.current.add(storyId);

    storiesApi.markViewed(storyId)
      .then(() => onViewed?.(storyId))
      .catch((e) => {
        console.error("[story-view] failed", e);
      });
  }, [isOpen, storyId, onViewed]);

  useEffect(() => {
    if (!isOpen || !hasStories) return undefined;

    const stepMs = 50;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + (stepMs / duration) * 100;

        if (next >= 100) {
          window.clearInterval(interval);
          goNext();
          return 100;
        }

        return next;
      });
    }, stepMs);

    return () => window.clearInterval(interval);
  }, [isOpen, hasStories, duration, storyId, goNext]);

  const progressBars = useMemo(() => {
    return stories.map((story, index) => {
      if (index < storyIndex) return 100;
      if (index > storyIndex) return 0;
      return progress;
    });
  }, [stories, storyIndex, progress]);

  if (!isOpen || !hasStories) return null;

  return (
    <div className="storyViewer" role="dialog" aria-modal="true" aria-label="Перегляд story">
      <AppHeader />

      <div className="storyViewer__page">
        <div className="storyViewer__bgDots" aria-hidden="true" />

        <div className="storyViewer__card">
          <div className="storyViewer__progress">
            {progressBars.map((value, index) => (
              <div className="storyViewer__progressTrack" key={stories[index]?.id || index}>
                <span style={{ width: `${value}%` }} />
              </div>
            ))}
          </div>

          <div className="storyViewer__author">
            <img src={authorAvatar} alt="" />
            <div className="storyViewer__authorText">
              <div>
                <span className="storyViewer__authorName">{getAuthorName(author)}</span>
                <span className="storyViewer__time">10 ч.</span>
              </div>
              {/* <span className="storyViewer__music">♫ random music</span> */}
            </div>
          </div>

          <button
            type="button"
            className="storyViewer__menu"
            aria-label="Більше"
          >
            ⋮
          </button>

          <button
            type="button"
            className="storyViewer__tap storyViewer__tap--left"
            onClick={goPrev}
            aria-label="Попередня story"
          />

          <button
            type="button"
            className="storyViewer__tap storyViewer__tap--right"
            onClick={goNext}
            aria-label="Наступна story"
          />

          <div className="storyViewer__mediaWrap">
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                className="storyViewer__media"
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const seconds = e.currentTarget.duration;
                  if (Number.isFinite(seconds) && seconds > 0) {
                    setDuration(Math.min(Math.max(seconds * 1000, 3000), 15000));
                  }
                }}
                onEnded={goNext}
              />
            ) : (
              <img src={mediaUrl} alt="" className="storyViewer__media" />
            )}
          </div>

          {currentStory?.text && (
            <div className="storyViewer__caption">{currentStory.text}</div>
          )}
        </div>

        <div className="storyViewer__actions">
          <button type="button" className="storyViewer__action">
            <div className="storyViewer__viewers">
              <span />
              <span />
              <span />
            </div>
            <span>Просмотрено</span>
          </button>

          <button type="button" className="storyViewer__action">
            <img
              src={profileIcons.storyForward}
              alt=""
              className="storyViewer__actionImg"
            />
            <span>Переслать</span>
          </button>

          <button type="button" className="storyViewer__action">
            <div className="storyViewer__shareIconsWrap">
              <img src={profileIcons.profileInfoTelegram} alt="Telegram" className="storyViewer__shareIcons" />
              <img src={profileIcons.profileInfoInstagram} alt="Instagram" className="storyViewer__shareIcons" />
            </div>
            <span>Поделиться</span>
          </button>

          <button type="button" className="storyViewer__action">
            <span className="storyViewer__actionIcon">@</span>
            <span>Отметить</span>
          </button>

          {isOwnStory ? (
            <button
              type="button"
              className="storyViewer__action"
              onClick={() => onDeleteStory?.(storyId)}
            >
              <span className="storyViewer__actionIcon">⋮</span>
              <span>Удалить</span>
            </button>
          ) : (
            <button type="button" className="storyViewer__action">
              <span className="storyViewer__actionIcon">⋮</span>
              <span>Еще</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}