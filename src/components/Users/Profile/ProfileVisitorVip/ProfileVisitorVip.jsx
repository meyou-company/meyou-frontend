import { useEffect, useMemo, useState } from "react";
import profileIcons from "../../../../constants/profileIcons";
import "./ProfileVisitorVip.scss";
import { FeedCard } from "../../../FirstPage/FirstPageView";

const TABS = [
  { id: "info", label: "Информация" },
  { id: "stories", label: "Истории" },
  { id: "video", label: "Видео" },
  { id: "photo", label: "Фото" },
];

export default function ProfileVisitorVip({
  user,
  onUnsubscribe,
  onVipChat,
  onGifts,
  onReport,
  onShowMoreFriends,
  followingList,
}) {
  const [activeTab, setActiveTab] = useState("info");
  const [viewImageUrl, setViewImageUrl] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isFriendImage, setIsFriendImage] = useState(false);

  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768);

  useEffect(() => {
  if (!viewImageUrl) return;

  const onEscape = (e) => {
    if (e.key === "Escape") setViewImageUrl(null);
  };

  window.addEventListener("keydown", onEscape);
  return () => window.removeEventListener("keydown", onEscape);
}, [viewImageUrl]);

  useEffect(() => {
  const handleResize = () => {
    setIsTablet(window.innerWidth >= 768);
  };
  

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
  
  const formatName = (str) =>
  str
    ?.toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const displayName = formatName(
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      "User"
    );

  const titleName = user?.username || user?.fullNameReal || "User";

  const displayAvatar =
    user?.avatarUrl || user?.avatar || "/Logo/photo.png";

    const locationParts = [user.city, user.country].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(", ") : (user.location || user.subtitle || "");

  const isOnline = user?.online !== false;

  const toFriendItem = (f) => ({
  id: f?.id ?? f,
  username: f?.username,
  avatar: f?.avatarUrl ?? f?.avatar ?? null,
});

  const friends = useMemo(() => {
      if (Array.isArray(followingList) && followingList.length > 0) {
        return followingList.map(toFriendItem);
      }
      return Array.isArray(user?.friends) ? user.friends.map(toFriendItem) : [];
    }, [followingList, user?.friends]);
    

    const mockFriends = [
  {
    id: "1",
    username: "anna_smith",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "2",
    username: "john_doe",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: "3",
    username: "kate_m",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
  {
    id: "4",
    username: "alex_dev",
    avatar: "https://i.pravatar.cc/150?img=4",
  },
  {
    id: "5",
    username: "lisa_star",
    avatar: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "6",
    username: "mike_x",
    avatar: "https://i.pravatar.cc/150?img=6",
  },
];

    const friendsToRender = friends.length > 0 ? friends : mockFriends;

  const actions = [
    {
      id: "vip",
      icon: isTablet ? profileIcons.chat : profileIcons.vipChat,
      label: "VIP Chat",
      onClick: onVipChat,
    },
    {
      id: "gifts",
      icon: profileIcons.present,
      label: "Подарки",
      onClick: onGifts,
    },
    {
      id: "report",
      icon: profileIcons.complaint,
      label: "Пожаловаться",
      onClick: onReport,
    },
  ].filter(a => a.onClick);

  return (
    <div className="profile-visitor-vip">
      <section className="profile-visitor-vip__top">

        {/* ===== LEFT BLOCK ===== */}
        <div className="profile-visitor-vip__avatarBlock">

          <div
            className="profile-visitor-vip__avatarWrap"
            onClick={() => {
  setIsFriendImage(false);
  setViewImageUrl(displayAvatar);
}}
          >
            <img
              src={displayAvatar}
              alt=""
              className="profile-visitor-vip__avatar"
            />
            {isOnline && (
              <span className="profile-visitor-vip__onlineDot" />
            )}
          </div>

          {isOnline && (
            <p className="profile-visitor-vip__onlineLabel">
              Online
            </p>
          )}

          {onUnsubscribe && (
            <button
              className="profile-visitor-vip__btnDelete"
              onClick={onUnsubscribe}
            >
              Удалить
            </button>
          )}
        </div>

        {/* ===== RIGHT BLOCK ===== */}
        <div className="profile-visitor-vip__infoBlock">

          <div className="profile-visitor-vip__nameBlock">
            <div className="profile-visitor-vip__nameWrap">
             <h1 className="profile-visitor-vip__name">
            {titleName}
          </h1>
          <p className="profile-visitor-vip__info">{displayName}</p>
          <p className="profile-visitor-vip__info">{locationStr || "Не указано"}</p>
          </div>
         
         {/* ACTIONS */}
          {actions.length > 0 && (
            <div className="profile-visitor-vip__actions">
            {actions.map(({ id, icon, label, onClick }) => (
            <button
              key={id}
              className={`profile-visitor-vip__iconItem ${
                id === "vip" ? "profile-visitor-vip__iconItem--vip" : ""
              }`}
              onClick={onClick}
            >
              {id === "vip" ? (
                <img
                src={icon}
                alt=""
                className="profile-visitor-vip__icon"
              />
              ) : (
                <img src={icon} alt="" className="profile-visitor-vip__icon" />
              )}
              <span className="profile-visitor-vip__iconLabel">
                {label}
              </span>
            </button>
          ))}
            </div>
          )}
          </div> 

          {/* TABS */}
          <div className="profile-visitor-vip__tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`profile-visitor-vip__tab ${
                  activeTab === tab.id
                    ? "profile-visitor-vip__tab--active"
                    : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ===== FRIENDS ===== */}
      <section className="profile-visitor-vip__friends">

        {/* ===== VIP FRIENDS ===== */}
           <h2 className="profile-visitor-vip__friendsTitle">
            <p className="profile-visitor-vip__friendsSubtitle">VIP</p>
           <img src={profileIcons.vip} className="profile-visitor-vip__vipIcon"/>
          <p className="profile-visitor-vip__friendsSubtitle">{friends.length}</p>
        </h2>
        <div className="profile-visitor-vip__friendsGrid">
  {friendsToRender.length > 0 && (
    <>
      {friendsToRender.map((friend) => (
        <div
          key={`vip-${friend.id}`}
          className="profile-visitor-vip__friendCard profile-visitor-vip__friendCard--vip"
          onClick={() => {
  setIsFriendImage(true);
  setViewImageUrl(friend.avatar);
}}
        >
          <div className="profile-visitor-vip__friendAvatar profile-visitor-vip__friendAvatar--vip">
            <img src={friend.avatar} alt="" />
            {isOnline && ( <span className="profile-visitor-vip__onlineDot--friend" /> )}
          </div>
        </div>
      ))}
    </>
  )} 
  </div>

  {/* ===== REGULAR FRIENDS ===== */}
 <h2 className="profile-visitor-vip__friendsTitle">
          Друзья {friends.length}
        </h2>
  <div className="profile-visitor-vip__friendsGrid">
  {friendsToRender.slice(0, 6).map((friend) => (
    <div
      key={friend.id}
      className="profile-visitor-vip__friendCard"
      onClick={() => {
  setIsFriendImage(true);
  setViewImageUrl(friend.avatar);
}}
    >
      <div className="profile-visitor-vip__friendAvatar">
         <img src={friend.avatar} alt="" />
        {isOnline && ( <span className="profile-visitor-vip__onlineDot--friend" /> )}
      </div>
    </div>
    ))}
   </div>

        {onShowMoreFriends && (
          <button
            className="profile-visitor-vip__showMore"
            onClick={onShowMoreFriends}
          >
            Показать больше
          </button>
        )}
        
      </section>

      <section className="profile-visitor-vip__feed">
      <FeedCard name={displayName} time="2 дня назад" location={user?.location || "Не указано"} status="online" text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies ultricies, nunc nisl ultricies nunc, eget ultricies nunc nisl eget ultricies." />
      </section>

      {viewImageUrl && (
  <div
    className="profile-visitor-vip__imageViewer"
    onClick={() => setViewImageUrl(null)}
  >
    <button
      type="button"
      className="profile-visitor-vip__imageViewerClose"
      onClick={() => setViewImageUrl(null)}
    >
      ×
    </button>

    <img
      src={viewImageUrl}
      alt=""
      className="profile-visitor-vip__imageViewerImg"
      onClick={(e) => e.stopPropagation()}
      draggable={false}
    />
  </div>
)}
    </div>
  );
}