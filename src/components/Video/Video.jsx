import { useState } from "react";
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

const Video = () => {
   const [showAll, setShowAll] = useState(false);

  return (
    <div className="video">
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
          <img
           className="video__searchIcon"
           src={profileIcons.searchVideo}
           alt="Поиск видео иконка"
         />
        </div>
      </div>

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
        </div>

        <div className="video__grid">
            {(showAll ? videos : videos.slice(0, 4)).map((video) => (
            <div key={video.id} className="video-card">
              <img src={video.image} alt="" />

              <div className="video-card__overlay">
                <div className="video-card__play">▶</div>

                <div className="video-card__info">
                  <div>
                    <p className="video-card__name">{video.name}</p>
                    <p className="video-card__location">
                      📍 {video.location}
                    </p>
                  </div>

                  <div className="video-card__stats">
                    ❤️ {video.likes}
                    💬 {video.comments}
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