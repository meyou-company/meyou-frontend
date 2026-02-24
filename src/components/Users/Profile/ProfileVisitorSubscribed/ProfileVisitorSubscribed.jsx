// Сторінка профілю, коли ти підписаний на людину (не VIP) — layout як на макеті
import { useEffect, useMemo, useState } from "react";

import profileIcons from "../../../../constants/profileIcons";
import "./ProfileVisitorSubscribed.scss";

const toFriendItem = (f) => ({
  id: f?.id ?? f,
  username: f?.username,
  avatar: f?.avatarUrl ?? f?.avatar ?? null,
});

export default function ProfileVisitorSubscribed({
  user,
  onAddToVip,
  onUnsubscribe,
  onVipChat,
  onGifts,
  onReport,
  onShowMoreFriends,
  onOpenUser,
  onViewPhoto: onViewPhotoExternal,
}) {
  const [activeTab, setActiveTab] = useState("info"); // info | stories | video | photo
  const [viewImageUrl, setViewImageUrl] = useState(null);

  const onViewPhoto = (url) => {
    if (onViewPhotoExternal) onViewPhotoExternal(url);
    else setViewImageUrl(url);
  };

  useEffect(() => {
    if (!viewImageUrl) return;
    const onEscape = (e) => e.key === "Escape" && setViewImageUrl(null);
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [viewImageUrl]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.nick ||
    user?.nickname ||
    "Користувач";
  const displayAvatar =
    user?.avatarUrl || user?.avatar || "/Logo/photo.png";
  const isOnline = user?.online !== false;

  const friends = useMemo(
    () => (Array.isArray(user?.friends) ? user.friends.map(toFriendItem) : []),
    [user?.friends]
  );
  const friendsCount = friends.length;

  const tabs = [
    { id: "info", label: "Информация", locked: false },
    { id: "stories", label: "Истории", locked: false },
    { id: "video", label: "Видео", locked: true },
    { id: "photo", label: "Фото", locked: true },
  ];

  return (
    <div className="profile-visitor-subscribed">
      <section className="profile-visitor-subscribed__top">
        <div className="profile-visitor-subscribed__left">
          <div
            className="profile-visitor-subscribed__avatarWrap"
            role="button"
            tabIndex={0}
            onClick={() => onViewPhoto?.(displayAvatar)}
            onKeyDown={(e) =>
              e.key === "Enter" && onViewPhoto?.(displayAvatar)
            }
            aria-label="Переглянути фото"
          >
            <img
              src={displayAvatar}
              alt=""
              className="profile-visitor-subscribed__avatar"
            />
            {isOnline && (
              <span
                className="profile-visitor-subscribed__onlineDot"
                aria-hidden="true"
              />
            )}
          </div>
          {isOnline && (
            <p className="profile-visitor-subscribed__onlineLabel">Online</p>
          )}
        </div>

        <div className="profile-visitor-subscribed__right">
          <h1 className="profile-visitor-subscribed__name">{displayName}</h1>

          <div className="profile-visitor-subscribed__iconsRow">
            <button
              type="button"
              className="profile-visitor-subscribed__iconItem"
              onClick={onVipChat}
              aria-label="VIP Chat"
              disabled
              title="VIP Chat (заблоковано)"
            >
              <span className="profile-visitor-subscribed__iconWrap">
                <img
                  src={profileIcons.vip}
                  alt=""
                  className="profile-visitor-subscribed__iconImg"
                  aria-hidden="true"
                />
                <img
                  src={profileIcons.lockBlack}
                  alt=""
                  className="profile-visitor-subscribed__lockIcon"
                  aria-hidden="true"
                />
              </span>
              <span className="profile-visitor-subscribed__iconLabel">
                VIP Chat
              </span>
            </button>

            <button
              type="button"
              className="profile-visitor-subscribed__iconItem"
              onClick={onGifts}
              aria-label="Подарки"
            >
              <img
                src={profileIcons.giftIcon}
                alt=""
                className="profile-visitor-subscribed__iconImg"
                aria-hidden="true"
              />
              <span className="profile-visitor-subscribed__iconLabel">
                Подарки
              </span>
            </button>

            <button
              type="button"
              className="profile-visitor-subscribed__iconItem"
              onClick={onReport}
              aria-label="Пожаловаться"
            >
              <span className="profile-visitor-subscribed__reportIcon" aria-hidden="true">!</span>
              <span className="profile-visitor-subscribed__iconLabel">
                Пожаловаться
              </span>
            </button>
          </div>

          <button
            type="button"
            className="profile-visitor-subscribed__btnAddVip"
            onClick={onAddToVip}
            aria-label="Добавить в VIP"
          >
            Добавить в VIP
          </button>

          <button
            type="button"
            className="profile-visitor-subscribed__btnDelete"
            onClick={onUnsubscribe}
            aria-label="Удалить из подписок"
          >
            Удалить
          </button>
        </div>
      </section>

      {/* Таби: Информация | Истории | Видео 🔒 | Фото 🔒 */}
      <div className="profile-visitor-subscribed__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={tab.locked}
            className={`profile-visitor-subscribed__tab ${
              activeTab === tab.id ? "profile-visitor-subscribed__tabActive" : ""
            } ${tab.locked ? "profile-visitor-subscribed__tabLocked" : ""}`}
            onClick={() => !tab.locked && setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.locked && (
              <img
                src={profileIcons.lockBlack}
                alt=""
                className="profile-visitor-subscribed__tabLock"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* Контент табу (поки заглушка) */}
      {activeTab === "info" && (
        <div className="profile-visitor-subscribed__tabContent">
          {user?.city || user?.country ? (
            <p className="profile-visitor-subscribed__infoText">
              {[user?.city, user?.country].filter(Boolean).join(", ")}
            </p>
          ) : (
            <p className="profile-visitor-subscribed__infoText">
              Інформація недоступна
            </p>
          )}
        </div>
      )}

      {/* Друзья */}
      <section className="profile-visitor-subscribed__friends">
        <h2 className="profile-visitor-subscribed__friendsTitle">
          Друзья {friendsCount}
        </h2>
        <div className="profile-visitor-subscribed__friendsGrid">
          {friends.slice(0, 10).map((f) => (
            <button
              key={f.id}
              type="button"
              className="profile-visitor-subscribed__friendAvatar"
              onClick={() => f.username && onOpenUser?.(f.username)}
              aria-label={f.username ? `Профіль ${f.username}` : ""}
            >
              <img
                src={f.avatar || "/icon1/image0.png"}
                alt=""
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="profile-visitor-subscribed__showMore"
          onClick={onShowMoreFriends}
        >
          Показать больше
        </button>
      </section>

      {/* Перегляд фото в повному розмірі */}
      {viewImageUrl && (
        <div
          className="profile-visitor-subscribed__imageViewer"
          role="dialog"
          aria-modal="true"
          aria-label="Фото в повному розмірі"
          onClick={() => setViewImageUrl(null)}
        >
          <button
            type="button"
            className="profile-visitor-subscribed__imageViewerClose"
            onClick={() => setViewImageUrl(null)}
            aria-label="Закрити"
          >
            ×
          </button>
          <img
            src={viewImageUrl}
            alt=""
            className="profile-visitor-subscribed__imageViewerImg"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
