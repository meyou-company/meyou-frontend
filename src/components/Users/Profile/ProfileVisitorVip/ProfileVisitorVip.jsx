import {  useMemo, useState } from "react";
import profileIcons from "../../../../constants/profileIcons";
import "./ProfileVisitorVip.scss";

const toFriendItem = (f) => ({
  id: f?.id ?? f,
  username: f?.username,
  avatar: f?.avatarUrl ?? f?.avatar ?? null,
});

export default function ProfileVisitorVip({
  user,
  onUnsubscribe,
  onVipChat,
  onGifts,
  onReport,
  onShowMoreFriends,
  onOpenUser,
  onViewPhoto: onViewPhotoExternal,
}) {
  const [activeTab, setActiveTab] = useState("info");
  // const [viewImageUrl, setViewImageUrl] = useState(null);

  const onViewPhoto = (url) => {
    if (onViewPhotoExternal) onViewPhotoExternal(url);
    // else setViewImageUrl(url);
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "User";

  const displayAvatar =
    user?.avatarUrl || user?.avatar || "/Logo/photo.png";

  const isOnline = user?.online !== false;

  const friends = useMemo(
    () => (Array.isArray(user?.friends) ? user.friends.map(toFriendItem) : []),
    [user?.friends]
  );

  const tabs = [
    { id: "info", label: "Информация" },
    { id: "stories", label: "Истории" },
    { id: "video", label: "Видео" },
    { id: "photo", label: "Фото" },
  ];

  return (
    <div className="profile-visitor-vip">
      <section className="profile-visitor-vip__top">
        <div className="profile-visitor-vip__avatarBlock">
          <div
            className="profile-visitor-vip__avatarWrap"
            onClick={() => onViewPhoto(displayAvatar)}
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
            <p className="profile-visitor-vip__onlineLabel">Online</p>
          )}

          <button
            className="profile-visitor-vip__btnDelete"
            onClick={onUnsubscribe}
          >
            Удалить
          </button>
        </div>

        <div className="profile-visitor-vip__infoBlock">
          <h1 className="profile-visitor-vip__name">{displayName}</h1>

          <div className="profile-visitor-vip__actions">
            <button
              className="profile-visitor-vip__iconItem"
              onClick={onVipChat}
            >
              <img src={profileIcons.vip} alt="" className="profile-visitor-vip__icon"/>
              <span className="profile-visitor-vip__iconLabel">VIP Chat</span>
            </button>

            <button
              className="profile-visitor-vip__iconItem"
              onClick={onGifts}
            >
              <img src={profileIcons.giftIcon} alt="" className="profile-visitor-vip__icon"/>
              <span className="profile-visitor-vip__iconLabel">Подарки</span>
            </button>

            <button
              className="profile-visitor-vip__iconItem"
              onClick={onReport}
            >
              <span className="profile-visitor-vip__reportIcon">
                <img src={profileIcons.complaint} alt=""  className="profile-visitor-vip__icon"/>
              </span>
              <span className="profile-visitor-vip__iconLabel">Пожаловаться</span>
            </button>
          </div>

          <div className="profile-visitor-vip__tabs">
            {tabs.map((tab) => (
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

      <section className="profile-visitor-vip__friends">
        <h2 className="profile-visitor-vip__friendsTitle">
          Друзья {friends.length}
        </h2>

        <div className="profile-visitor-vip__friendsGrid">
          {friends.slice(0, 10).map((f) => (
            <button
              key={f.id}
              className="profile-visitor-vip__friendAvatar"
              onClick={() => f.username && onOpenUser?.(f.username)}
            >
              <img
                src={f.avatar || "/icon1/image0.png"}
                alt=""
              />
            </button>
          ))}
        </div>

        <button
          className="profile-visitor-vip__showMore"
          onClick={onShowMoreFriends}
        >
          Показать больше
        </button>
      </section>
    </div>
  );
}