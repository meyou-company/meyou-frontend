import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NAV_ITEMS } from "../../constants/navigation";
import profileIcons from "../../constants/profileIcons";
import { videosApi } from "../../services/videosApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { mapApiVideosToCards } from "../../utils/mapApiVideoToCard";
import { useAuthStore } from "../../zustand/useAuthStore";
import VideoPlayerModal from "./VideoPlayerModal";
import VideoUploadModal from "./VideoUploadModal";
import "./Video.scss";

const VIDEO_TABS = [
  { id: "recommended", label: "Рекомендованные" },
  { id: "all", label: "Общие" },
  { id: "following", label: "Подписки" },
  { id: "saved", label: "Сохраненные" },
];

const AUTH_REQUIRED_TABS = new Set(["following", "saved"]);

function Header({ currentPage, alwaysVisible = false }) {
  const navigate = useNavigate();

  return (
    <div className={`video__desktopHeader ${alwaysVisible ? "always" : ""}`}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === currentPage;

        return (
          <div
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`video__navItem ${isActive ? "active" : ""}`}
          >
            <img
              src={
                isActive
                  ? profileIcons[item.icon + "Active"] || profileIcons[item.icon]
                  : profileIcons[item.icon]
              }
              className="video__navigationIcon"
              alt={item.label}
            />
            <span className="video__navigationTitle">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const Video = () => {
  const navigate = useNavigate();
  const isAuthed = useAuthStore((s) => s.isAuthed);

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
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1440);

  const lastReqId = useRef(0);

  const activeTabLabel = useMemo(
    () => VIDEO_TABS.find((tab) => tab.id === activeTab)?.label ?? "Рекомендованные",
    [activeTab],
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
    setActiveTab(tabId);
  };

  const handleVideoCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab("all");
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

  return (
    <div className="video">
      <Header currentPage="video" />

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
          {VIDEO_TABS.map((tab) => (
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
                <img
                  src={video.image}
                  alt={video.title || video.name}
                  className="video__preview"
                />

                <div className="video-card__overlay">
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
                    <div>
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
                      <span className="video__statsWrapper">
                        <img
                          className="video__statsIcon"
                          src={profileIcons.heartVideo}
                          alt="Лайк иконка"
                        />{" "}
                        {video.likes}
                      </span>
                      <span className="video__statsWrapper">
                        <img
                          className="video__statsIcon"
                          src={profileIcons.commentsVideo}
                          alt="Комментарий иконка"
                        />{" "}
                        {video.comments}
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
      />
    </div>
  );
};

export default Video;
export { Header };
