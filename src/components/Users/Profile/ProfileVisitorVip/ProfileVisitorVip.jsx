import { useMemo, useState } from "react";
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
  onOpenUser,
  onViewPhoto,
}) {
  const [activeTab, setActiveTab] = useState("info");

  const displayName = useMemo(() => {
    return (
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      "User"
    );
  }, [user]);

  const titleName = user?.username || user?.fullNameReal || "User";

  const displayAvatar =
    user?.avatarUrl || user?.avatar || "/Logo/photo.png";

  const isOnline = user?.online !== false;

  const friends = useMemo(
    () => (Array.isArray(user?.friends) ? user.friends : []),
    [user?.friends]
  );

  const actions = [
    {
      id: "vip",
      icon: profileIcons.chat,
      label: "VIP Chat",
      onClick: onVipChat,
    },
    {
      id: "gifts",
      icon: profileIcons.giftIcon,
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
            onClick={() => onViewPhoto?.(displayAvatar)}
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
            <div>
             <h1 className="profile-visitor-vip__name">
            {titleName}
          </h1>
          <p>{displayName}</p>
          <p className="profile-visitor-vip__location">{user?.location || "Не указано"}</p>
          </div>
         
         {/* ACTIONS */}
          {actions.length > 0 && (
            <div className="profile-visitor-vip__actions">
              {actions.map(({ id, icon, label, onClick }) => (
                <button
                  key={id}
                  className="profile-visitor-vip__iconItem"
                  onClick={onClick}
                >
                  <img
                    src={icon}
                    alt=""
                    className="profile-visitor-vip__icon"
                  />
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

        <h2 className="profile-visitor-vip__friendsTitle">
          Друзья {friends.length}
        </h2>

        <div className="profile-visitor-vip__friendsGrid">
          {friends.slice(0, 10).map((f) => {
            const id = f?.id ?? f;
            const username = f?.username;
            const avatar =
              f?.avatarUrl ||
              f?.avatar ||
              "/icon1/image0.png";

            return (
              <button
                key={id}
                className="profile-visitor-vip__friendAvatar"
                onClick={() =>
                  username && onOpenUser?.(username)
                }
              >
                <img src={avatar} alt="" />
              </button>
            );
          })}
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
    </div>
  );
}