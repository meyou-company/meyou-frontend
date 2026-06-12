import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useNavItems } from "../../hooks/useNavItems";
import profileIcons from "../../constants/profileIcons";
import { videosApi } from "../../services/videosApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { mapApiVideosToCards, formatVideoCount } from "../../utils/mapApiVideoToCard";
import MessagesNavBadge from "../Messages/MessagesNavBadge";
import { useAuthStore } from "../../zustand/useAuthStore";
import DeletePostConfirmDialog from "../PostFeed/DeletePostConfirmDialog";
import VideoCardThumbnail from "./VideoCardThumbnail";
import VideoPlayerModal from "./VideoPlayerModal";
import VideoUploadModal from "./VideoUploadModal";
import "./Video.scss";

const VIDEO_TAB_IDS = ["recommended", "mine", "all", "following", "saved"];

const AUTH_REQUIRED_TABS = new Set(["mine", "following", "saved"]);

function Header({ currentPage, alwaysVisible = false }) {
  const navigate = useNavigate();
  const navItems = useNavItems();

  return (
    <div className={`video__desktopHeader ${alwaysVisible ? "always" : ""}`}>
      {navItems.map((item) => {
        const isActive = item.key === currentPage;

        return (
          <div
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`video__navItem ${isActive ? "active" : ""}`}
          >
            <span className="video__navIconWrap">
              <img
                src={profileIcons[item.icon]}
                className="video__navigationIcon"
                alt={item.label}
              />
              {item.key === "messages" && <MessagesNavBadge />}
            </span>
            <span className="video__navigationTitle">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const Video = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const currentUser = useAuthStore((s) => s.user);

  const videoTabs = useMemo(
    () =>
      VIDEO_TAB_IDS.map((id) => ({
        id,
        label: t(`video.tabs.${id}`),
      })),
    [t],
  );

  const [showAll, setShowAll] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("recommended");
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [saveLoadingId, setSaveLoadingId] = useState(null);
  const [likeLoadingId, setLikeLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1440);

  const lastReqId = useRef(0);

  const activeTabLabel = useMemo(
    () => videoTabs.find((tab) => tab.id === activeTab)?.label ?? t("video.tabs.recommended"),
    [activeTab, videoTabs, t],
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1440);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setShowAll(false);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    const reqId = ++lastReqId.current;

    const timer = setTimeout(async () => {
      if (AUTH_REQUIRED_TABS.has(activeTab) && !isAuthed) {
        setVideos([]);
        setError("Войдите, чтобы просматривать эту вкладку");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await videosApi.list({
          tab: activeTab,
          search: searchQuery,
          limit: showAll ? 50 : 12,
          page: 1,
        });

        if (reqId !== lastReqId.current) return;

        setVideos(mapApiVideosToCards(result.items));
      } catch (err) {
        if (reqId !== lastReqId.current) return;

        console.error("[video-feed] failed", err);
        setVideos([]);
        setError(getApiErrorMessage(err) || "Не удалось загрузить видео");
      } finally {
        if (reqId === lastReqId.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, showAll, isAuthed, refreshKey]);

  const displayedVideos = useMemo(
    () => (showAll ? videos : videos.slice(0, 5)),
    [videos, showAll],
  );

  const handleAddClick = () => {
    if (!isAuthed) {
      toast.error("Войдите, чтобы добавить видео");
      navigate("/auth/login");
      return;
    }
    setIsUploadOpen(true);
  };

  const handleTabClick = (tabId) => {
    if (AUTH_REQUIRED_TABS.has(tabId) && !isAuthed) {
      toast.error("Войдите, чтобы просматривать эту вкладку");
      navigate("/auth/login");
      return;
    }
    setActiveTab(tabId);
  };

  const handleVideoCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab("mine");
  }, []);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  const handlePlayVideo = (video) => {
    if (!video?.videoUrl) {
      toast.error("Ссылка на видео недоступна");
      return;
    }
    setSelectedVideo(video);
  };

  const handleViewRecorded = useCallback((videoId, viewsCount) => {
    const formattedViews = formatVideoCount(viewsCount);
    setVideos((prev) =>
      prev.map((item) =>
        item.id === videoId ? { ...item, views: formattedViews } : item,
      ),
    );
    setSelectedVideo((prev) =>
      prev?.id === videoId ? { ...prev, views: formattedViews } : prev,
    );
  }, []);

  const handleToggleSave = async (e, video) => {
    e.stopPropagation();

    if (!isAuthed) {
      toast.error("Войдите, чтобы сохранить видео");
      navigate("/auth/login");
      return;
    }

    const videoId = video.id;
    const wasSaved = video.isSavedByMe;

    setVideos((prev) => {
      if (activeTab === "saved" && wasSaved) {
        return prev.filter((item) => item.id !== videoId);
      }
      return prev.map((item) =>
        item.id === videoId ? { ...item, isSavedByMe: !wasSaved } : item,
      );
    });

    setSaveLoadingId(videoId);

    try {
      if (wasSaved) {
        await videosApi.unsave(videoId);
        toast.success("Видео удалено из сохранённых");
      } else {
        await videosApi.save(videoId);
        toast.success("Видео сохранено");
      }
    } catch (err) {
      console.error("[video-save] failed", err);
      if (activeTab === "saved" && wasSaved) {
        setRefreshKey((prev) => prev + 1);
      } else {
        setVideos((prev) =>
          prev.map((item) =>
            item.id === videoId ? { ...item, isSavedByMe: wasSaved } : item,
          ),
        );
      }
      toast.error(getApiErrorMessage(err) || "Не удалось изменить сохранение");
    } finally {
      setSaveLoadingId(null);
    }
  };

  const applyLikeState = useCallback((videoId, likesCount, isLiked) => {
    const formattedLikes = formatVideoCount(likesCount);
    const patch = {
      isLikedByMe: isLiked,
      likesCount,
      likes: formattedLikes,
    };

    setVideos((prev) =>
      prev.map((item) => (item.id === videoId ? { ...item, ...patch } : item)),
    );
    setSelectedVideo((prev) =>
      prev?.id === videoId ? { ...prev, ...patch } : prev,
    );
  }, []);

  const handleToggleLike = async (e, video) => {
    e.stopPropagation();

    if (!isAuthed) {
      toast.error("Войдите, чтобы поставить лайк");
      navigate("/auth/login");
      return;
    }

    const videoId = video.id;
    const wasLiked = video.isLikedByMe;
    const prevCount = video.likesCount ?? 0;
    const optimisticCount = Math.max(0, prevCount + (wasLiked ? -1 : 1));

    applyLikeState(videoId, optimisticCount, !wasLiked);
    setLikeLoadingId(videoId);

    try {
      const result = wasLiked
        ? await videosApi.unlike(videoId)
        : await videosApi.like(videoId);

      const likesCount = Number(result?.likesCount);
      const isLiked =
        result?.isLiked === true ||
        result?.isLikedByMe === true ||
        result?.liked === true;

      applyLikeState(
        videoId,
        Number.isFinite(likesCount) ? likesCount : optimisticCount,
        isLiked,
      );
    } catch (err) {
      console.error("[video-like] failed", err);
      applyLikeState(videoId, prevCount, wasLiked);
      toast.error(getApiErrorMessage(err) || "Не удалось изменить лайк");
    } finally {
      setLikeLoadingId(null);
    }
  };

  const isOwnVideo = useCallback(
    (video) =>
      Boolean(
        isAuthed &&
          currentUser?.id &&
          video?.authorId &&
          String(video.authorId) === String(currentUser.id),
      ),
    [isAuthed, currentUser?.id],
  );

  const requestDeleteVideo = (e, video) => {
    e?.stopPropagation?.();

    if (!isAuthed) {
      toast.error("Войдите, чтобы удалить видео");
      navigate("/auth/login");
      return;
    }

    if (!isOwnVideo(video)) return;

    setDeleteTarget(video);
  };

  const handleCancelDeleteVideo = () => {
    if (isDeletingVideo) return;
    setDeleteTarget(null);
  };

  const handleConfirmDeleteVideo = async () => {
    if (!deleteTarget?.id || isDeletingVideo) return;

    setIsDeletingVideo(true);

    try {
      await videosApi.delete(deleteTarget.id);
      setVideos((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setSelectedVideo((prev) => (prev?.id === deleteTarget.id ? null : prev));
      toast.success("Видео удалено");
      setDeleteTarget(null);
    } catch (err) {
      console.error("[video-delete] failed", err);
      toast.error(getApiErrorMessage(err) || "Не удалось удалить видео");
    } finally {
      setIsDeletingVideo(false);
    }
  };

  return (
    <div className="video">
      <Header currentPage="video" alwaysVisible />

      <div className="video__header">
        <h1 className="video__title">
          {" "}
          Видео
          <img
            className="video__titleIcon"
            src={profileIcons.videoTitle}
            alt="Видео иконка"
          />
        </h1>

        <button type="button" className="video__addBtn" onClick={handleAddClick}>
          +{"\u00a0"} Добавить видео
        </button>
      </div>

      <div className="video__controls">
        <div className="video__tabs">
          {videoTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`video__tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="video__search">
          <input
            className="video__searchInput"
            placeholder="Поиск видео"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <button
            type="button"
            className={`video__searchBtn ${
              isSearchOpen && !isDesktop ? "hidden" : ""
            }`}
            onClick={() => setIsSearchOpen(true)}
          >
            <img
              className="video__searchIcon"
              src={profileIcons.searchVideo}
              alt="Поиск видео иконка"
            />
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="video__searchOverlay">
          <div className="video__searchBox">
            <img
              className="video__searchIconLeft"
              src={profileIcons.searchVideoPink}
              alt=""
            />

            <input
              className="video__searchInputMobile"
              placeholder="Я ищу..."
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            <button
              type="button"
              className="video__searchClose"
              onClick={() => setIsSearchOpen(false)}
            >
              <img
                className="video__searchCloseIcon"
                src={profileIcons.close}
                alt=""
              />
            </button>
          </div>
        </div>
      )}

      <div className="video__section">
        <div className="video__sectionHeader">
          <h2 className="video__subtitle">{activeTabLabel}</h2>
          {!showAll && videos.length > 5 && (
            <button
              type="button"
              className="video__subtitle video__showAll"
              onClick={() => setShowAll(true)}
            >
              Показать все
              <img
                className="video__showAllIcon"
                src={profileIcons.arrowVideo}
                alt="Стрелочка вправо иконка"
              />
            </button>
          )}

          <button
            type="button"
            className={`video__searchMobileBtn ${isSearchOpen ? "hidden" : ""}`}
            onClick={() => setIsSearchOpen(true)}
          >
            <img src={profileIcons.searchVideoPink} alt="search" />
          </button>
        </div>

        {loading && (
          <p className="video__status video__status--loading">Загрузка видео...</p>
        )}

        {!loading && error && (
          <p className="video__status video__status--error">{error}</p>
        )}

        {!loading && !error && displayedVideos.length === 0 && (
          <p className="video__status video__status--empty">Видео не найдены</p>
        )}

        {!loading && !error && displayedVideos.length > 0 && (
          <div className="video__grid">
            {displayedVideos.map((video) => (
              <div
                key={video.id}
                className="video-card"
                role="button"
                tabIndex={0}
                onClick={() => handlePlayVideo(video)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePlayVideo(video);
                  }
                }}
              >
                <VideoCardThumbnail
                  thumbnailUrl={video.thumbnailUrl}
                  videoUrl={video.videoUrl}
                  alt={video.title || video.name}
                  className="video__preview"
                />

                <div className="video-card__overlay">
                  {isOwnVideo(video) && (
                    <button
                      type="button"
                      className="video-card__delete"
                      onClick={(e) => requestDeleteVideo(e, video)}
                      aria-label="Удалить видео"
                    >
                      <img
                        src={profileIcons.closeBlack}
                        alt=""
                        className="video-card__deleteIcon"
                      />
                    </button>
                  )}

                  <button
                    type="button"
                    className={`video-card__save ${video.isSavedByMe ? "active" : ""}`}
                    onClick={(e) => handleToggleSave(e, video)}
                    disabled={saveLoadingId === video.id}
                    aria-label={video.isSavedByMe ? "Убрать из сохранённых" : "Сохранить видео"}
                    aria-pressed={video.isSavedByMe}
                  >
                    <img
                      src={profileIcons.savedPost}
                      alt=""
                      className="video-card__saveIcon"
                    />
                  </button>

                  <button
                    type="button"
                    className="video-card__play"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayVideo(video);
                    }}
                    aria-label="Включить видео"
                  >
                    <img
                      className="video__playIcon"
                      src={profileIcons.playVideo}
                      alt=""
                    />
                  </button>

                  <div className="video-card__info">
                    <div className="video-card__meta">
                      {video.title && (
                        <p className="video-card__title">{video.title}</p>
                      )}
                      <p className="video-card__name">{video.name}</p>
                      {video.location && (
                        <div className="video-card__location">
                          <img
                            className="video__locationIcon"
                            src={profileIcons.locationVideo}
                            alt="Локация Видео иконка"
                          />
                          <p className="video__locationText">{video.location}</p>
                        </div>
                      )}
                    </div>

                    <div className="video-card__stats">
                      <button
                        type="button"
                        className={`video-card__like ${video.isLikedByMe ? "active" : ""}`}
                        onClick={(e) => handleToggleLike(e, video)}
                        disabled={likeLoadingId === video.id}
                        aria-label={video.isLikedByMe ? "Убрать лайк" : "Поставить лайк"}
                        aria-pressed={video.isLikedByMe}
                      >
                        <img
                          className="video-card__likeIcon"
                          src={profileIcons.heartVideo}
                          alt=""
                        />
                        <span className="video-card__likeCount">{video.likes}</span>
                      </button>
                      <span className="video__statsWrapper">
                        <img
                          className="video__statsIcon video__statsIcon--views"
                          src={profileIcons.eyeOff}
                          alt="Просмотры"
                        />{" "}
                        {video.views}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onCreated={handleVideoCreated}
      />

      <VideoPlayerModal
        video={selectedVideo}
        isOpen={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
        isAuthed={isAuthed}
        currentUserId={currentUser?.id}
        onViewRecorded={handleViewRecorded}
        canDelete={Boolean(selectedVideo && isOwnVideo(selectedVideo))}
        onDeleteRequest={() => requestDeleteVideo(null, selectedVideo)}
      />

      <DeletePostConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onCancel={handleCancelDeleteVideo}
        onConfirm={handleConfirmDeleteVideo}
        confirming={isDeletingVideo}
        title="Удалить это видео?"
        description="Видео будет удалено без возможности восстановления."
        confirmLabel={isDeletingVideo ? "Удаление…" : "Удалить"}
        cancelLabel="Отмена"
      />
    </div>
  );
};

export default Video;
export { Header };
