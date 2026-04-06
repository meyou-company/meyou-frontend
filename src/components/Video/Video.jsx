import { useEffect, useState } from "react";
import "./Video.scss";
import profileIcons from "../../constants/profileIcons";

const videos = [
  {
    id: 1,
    name: "Мария",
    location: "Мадрид",
    image: "https://images.unsplash.com/photo-1493666438817-866a91353ca9",
    likes: "12.5K",
    comments: "320",
  },
  {
    id: 2,
    name: "Henry",
    location: "Germany",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    likes: "12.5K",
    comments: "320",
  },
  {
    id: 3,
    name: "Heily",
    location: "Kiev",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
    likes: "12.5K",
    comments: "320",
  },
  {
    id: 4,
    name: "Markus",
    location: "Provence",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    likes: "12.5K",
    comments: "320",
  },
    {
    id: 5,
    name: "Anna",
    location: "Paris",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
    likes: "8.2K",
    comments: "120",
  },
  {
    id: 6,
    name: "Leo",
    location: "Rome",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=600&fit=crop",
    likes: "15K",
    comments: "500",
  },
  {
    id: 7,
    name: "Kate",
    location: "London",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=600&fit=crop",
    likes: "9.7K",
    comments: "210",
  },
  {
    id: 8,
    name: "Tom",
    location: "NY",
    image: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=600&h=600&fit=crop",
    likes: "20K",
    comments: "800",
  },
    {
    id: 9,
    name: "Tom",
    location: "NY",
    image: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=600&h=600&fit=crop",
    likes: "20K",
    comments: "800",
  },
];

const currentPage = "video";

const Video = ({
  onGoHome,
  onGoPeople,
  onGoVideo,
  onGoMessages,
  onGoProfile,
}) => {
   const [showAll, setShowAll] = useState(false);
   const [isSearchOpen, setIsSearchOpen] = useState(false);

   const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1440);

useEffect(() => {
  const handleResize = () => {
    setIsDesktop(window.innerWidth >= 1440);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

   const navItems = [
  { label: "Главная", icon: "homeGreyVideo", onClick: onGoHome },
  { label: "Люди", icon: "peopleGreyVideo", onClick: onGoPeople },
  { label: "Видео", icon: "video", onClick: onGoVideo },
  { label: "Сообщения", icon: "chatGreyVideo", onClick: onGoMessages },
  { label: "Профиль", icon: "profileGreyVideo", onClick: onGoProfile },
];


  return (
    <div className="video">

      {/* DESKTOP NAVBAR */}
      <div className="video__desktopHeader">
    {navItems.map((item) => {
    const isActive = item.icon === currentPage;

    return (
      <div
        key={item.label}
        onClick={item.onClick}
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
        <span>{item.label}</span>
      </div>
    );
  })}
</div>

      {/* HEADER */}
      <div className="video__header">
        <h1 className="video__title"> Видео 
        <img
        className="video__titleIcon"
        src={profileIcons.videoTitle}
        alt="Видео иконка"
      />
        </h1>

        <button className="video__addBtn">
          +{"\u00a0"} Добавить видео
        </button>
      </div>

      {/* FILTERS */}
      <div className="video__controls">
        <div className="video__tabs">
          <button className="video__tab active">Рекомендованные</button>
          <button className="video__tab">Общие</button>
          <button className="video__tab">Подписки</button>
          <button className="video__tab">Сохраненные</button>
        </div>

        <div className="video__search">
          <input className="video__searchInput" placeholder="Поиск видео" />
          {/* <button  className={`video__searchBtn ${isSearchOpen ? "hidden" : ""}`} onClick={() => setIsSearchOpen(true)}> */}
          <button
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
      />

      <button
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

      {/* SECTION */}
      <div className="video__section">
        <div className="video__sectionHeader">
          <h2 className="video__subtitle">Рекомендованные</h2>
          <button className="video__subtitle video__showAll" onClick={() => setShowAll(true)}>Показать все
              <img
        className="video__showAllIcon"
        src={profileIcons.arrowVideo}
        alt="Стрелочка вправо иконка"
      />
          </button>

            <button
      className={`video__searchMobileBtn ${isSearchOpen ? "hidden" : ""}`} 
      onClick={() => setIsSearchOpen(true)}
    >
      <img src={profileIcons.searchVideoPink} alt="search" />
    </button>
        </div>

        <div className="video__grid">
            {(showAll ? videos : videos.slice(0, 5)).map((video) => (
            <div key={video.id} className="video-card">
              <img src={video.image} alt="" className="video__preview"/>

              <div className="video-card__overlay">
                <button className="video-card__play">
                  <img  className="video__playIcon"
              src={profileIcons.playVideo}
              alt="Включить Видео иконка"
             />
         </button>

                <div className="video-card__info">
                  <div>
                    <p className="video-card__name">{video.name}</p>
                    <div className="video-card__location">
                     <img  className="video__locationIcon" src={profileIcons.locationVideo} alt="Локация Видео иконка" />
                    <p className="video__locationText">{video.location}</p>
                    </div>
                  </div>

                  <div className="video-card__stats">
                    <span className="video__statsWrapper">
                    <img  className="video__statsIcon" src={profileIcons.heartVideo} alt="Лайк иконка" /> {video.likes}
                    </span>
                    <span className="video__statsWrapper">
                    <img  className="video__statsIcon" src={profileIcons.commentsVideo} alt="Комментарий иконка" /> {video.comments}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Video;