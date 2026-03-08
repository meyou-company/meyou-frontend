import { useEffect, useMemo, useState } from "react";

import profileIcons from "../../../../constants/profileIcons";
import { getFriendsCountNumber } from "../../../../utils/profileFriends";
import "./ProfileVisitorSubscribed.scss";

/** Мок постів для відображення на сторінці друга (поки немає API) */
const MOCK_POSTS = [
  {
    id: 1,
    time: "new post",
    location: "Рим, Италия",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: true,
    likes: 125,
    comments: 256,
    saved: 21,
    shared: 60,
  },
];

const toFriendItem = (f) => ({
  id: f?.id ?? f?._id ?? f,
  username: f?.username,
  firstName: f?.firstName,
  lastName: f?.lastName,
  avatar: f?.avatarUrl ?? f?.avatar ?? null,
  online: f?.online ?? true,
  isFollowingMe: f?.isFollowingMe === true,
  amIFollowing: f?.amIFollowing === true,
  isFriend: f?.isFriend === true,
  isVip: f?.isVip === true,
});

export default function ProfileVisitorSubscribed({
  user,
  /** Загальна кількість друзів у цієї людини (з API GET /users/:username); показується, коли ти на неї підписана */
  friendsCount: friendsCountProp,
  onAddToVip,
  onUnsubscribe,
  onVipChat,
  onGifts,
  onReport,
  onShowMoreFriends,
  onOpenUser,
  onViewPhoto: onViewPhotoExternal,
}) {
  const [activeTab, setActiveTab] = useState("delete"); // delete | info | stories | video | photo — як у макеті перший таб «Удалить» виділений
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

  const nickname = user?.username || user?.nick || user?.nickname || "";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "";
  const location = [user?.city, user?.country].filter(Boolean).join(", ").trim() || "";
  const displayName = fullName || nickname || "Користувач";

  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";
  const isOnline = user?.online !== false;

  const friends = useMemo(
    () => (Array.isArray(user?.friends) ? user.friends.map(toFriendItem) : []),
    [user?.friends]
  );
  /** Загальна кількість друзів з бекенду (friendsCount: { followers, following } або число); інакше — довжина списку */
  const apiCount = getFriendsCountNumber(friendsCountProp ?? user?.friendsCount ?? user?.friends_count);
  const displayFriendsCount =
    typeof apiCount === "number" && apiCount >= 0
      ? apiCount
      : Array.isArray(user?.friends)
        ? user.friends.length
        : 0;

  /** Таби як у макеті: спочатку Удалить (з градієнтом коли активний), потім Інформація, Історії, Відео, Фото */
  const tabs = [
    { id: "delete", label: "Удалить", locked: false },
    { id: "info", label: "Информация", locked: false },
    { id: "stories", label: "Истории", locked: false },
    { id: "video", label: "Видео", locked: true },
    { id: "photo", label: "Фото", locked: true },
  ];

  const onTabClick = (tabId) => {
    if (tabId === "delete") {
      onUnsubscribe?.();
      setActiveTab("info");
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="profile-visitor-subscribed">
      {/* ===== TOP як у макеті: зліва аватар + Online, по центру нік + ім'я + локація, справа VIP Chat + Подарки + Пожаловаться + Добавить в VIP ===== */}
      <section className="profile-visitor-subscribed__top">
        <div className="profile-visitor-subscribed__left">
          <div
            className="profile-visitor-subscribed__avatarWrap"
            role="button"
            tabIndex={0}
            onClick={() => onViewPhoto?.(displayAvatar)}
            onKeyDown={(e) => e.key === "Enter" && onViewPhoto?.(displayAvatar)}
            aria-label="Переглянути фото"
          >
            <img src={displayAvatar} alt="" className="profile-visitor-subscribed__avatar" />
            {isOnline && <span className="profile-visitor-subscribed__onlineDot" aria-hidden="true" />}
          </div>
          {isOnline && <p className="profile-visitor-subscribed__onlineLabel">Online</p>}
          {/* На мобілці нік/ім'я/локація під аватаром */}
          <div className="profile-visitor-subscribed__nameBlock profile-visitor-subscribed__nameBlock--mobile">
            <h1 className="profile-visitor-subscribed__nickname">{nickname || displayName}</h1>
            {fullName && nickname !== fullName && <p className="profile-visitor-subscribed__fullName">{fullName}.</p>}
            {location && <p className="profile-visitor-subscribed__location">{location}.</p>}
          </div>
        </div>

        <div className="profile-visitor-subscribed__center">
          <h1 className="profile-visitor-subscribed__nickname profile-visitor-subscribed__nickname--center">{nickname || displayName}</h1>
          {fullName && nickname !== fullName && <p className="profile-visitor-subscribed__fullName">{fullName}.</p>}
          {location && <p className="profile-visitor-subscribed__location">{location}.</p>}
        </div>

        <div className="profile-visitor-subscribed__right">
          <div className="pvs-top-right">
            <button
              type="button"
              className="pvs-tools__vip"
              onClick={onVipChat}
              aria-label="VIP Chat"
              disabled
              title="VIP Chat (заблоковано)"
            >
              <div className="pvs-tools__vipIconWrap">
                <img src={profileIcons.vipChat} alt="" className="pvs-tools__vipIcon pvs-tools__vipIcon--full" aria-hidden="true" />
              </div>
              <span className="pvs-tools__label">VIP Chat</span>
            </button>
            <div className="pvs-tools__row">
              <button type="button" className="pvs-tools__small" onClick={onGifts} aria-label="Подарки">
                <img src={profileIcons.present} alt="" className="pvs-tools__smallIcon" aria-hidden="true" />
                <span className="pvs-tools__smallLabel">Подарки</span>
              </button>
              <button type="button" className="pvs-tools__small" onClick={onReport} aria-label="Пожаловаться">
                <img src={profileIcons.complaints} alt="" className="pvs-tools__smallIcon" aria-hidden="true" />
                <span className="pvs-tools__smallLabel">Пожаловаться</span>
              </button>
            </div>
            <button type="button" className="pvs-actions__vipBtn" onClick={onAddToVip} aria-label="Добавить в VIP">
              <span className="pvs-actions__vipBtnText">Добавить в VIP</span>
              <img src="/icon-black/vip-button.svg" alt="" className="pvs-actions__vipBtnIcon" width={15} height={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Таби як у макеті: Удалить (з градієнтом), Информация, Истории, Видео 🔒, Фото 🔒 */}
      <div className="pvs-actions__tabs pvs-actions__tabs--standalone" role="tablist" aria-label="Табы профиля">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={tab.locked}
            className={["pvs-actions__tab", activeTab === tab.id ? "is-active" : "", tab.id === "delete" ? "pvs-actions__tab--delete" : "", tab.locked ? "is-locked" : ""].join(" ")}
            onClick={() => (tab.id === "delete" ? onTabClick("delete") : !tab.locked && onTabClick(tab.id))}
          >
            <span className="pvs-actions__tabText">{tab.label}</span>
            {tab.locked && <img src={profileIcons.lockBlack} alt="" className="pvs-actions__tabLock" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="pvs-tabs-mobile" role="tablist" aria-label="Табы профиля">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={tab.locked}
            className={["pvs-actions__tab", activeTab === tab.id ? "is-active" : "", tab.id === "delete" ? "pvs-actions__tab--delete" : "", tab.locked ? "is-locked" : ""].join(" ")}
            onClick={() => (tab.id === "delete" ? onTabClick("delete") : !tab.locked && onTabClick(tab.id))}
          >
            <span className="pvs-actions__tabText">{tab.label}</span>
            {tab.locked && <img src={profileIcons.lockBlack} alt="" className="pvs-actions__tabLock" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT: для табів «Удалить» / «Информация» нічого не показуємо ===== */}
      {(activeTab === "info" || activeTab === "delete") && null}

      {/* ===== FRIENDS: такий самий блок як у моєму профілі (vipCard, friendsTitle, vipRow, showMoreBtn) — тільки з його друзями ===== */}
      <section className="vipCard profile-visitor-subscribed__friends" aria-label={displayFriendsCount > 0 ? `Друзья, всього ${displayFriendsCount}` : "Друзья"}>
        <div className="friendsTitle">Друзья {displayFriendsCount}</div>

        {(friends.length > 0 || displayFriendsCount > 0) ? (
          <>
            <div className="vipRow">
              {(friends.length > 0
                ? friends.slice(0, 7)
                : Array.from({ length: Math.min(displayFriendsCount, 7) }, (_, i) => ({ id: `placeholder-${i}`, avatar: null, username: null }))
              ).map((f) => (
                <div key={f.id} className="vipItem">
                  <button
                    type="button"
                    className="vipAvatarWrap vipAvatarWrap--clickable"
                    onClick={() => f.username && onOpenUser?.(f.username)}
                    aria-label={f.username ? `Профіль ${f.username}` : "Профіль"}
                  >
                    <img
                      src={f.avatar || "/icon1/image0.png"}
                      className="vipAvatar"
                      alt=""
                    />
                    <span className="onlineDot" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="showMoreBtn"
              onClick={onShowMoreFriends}
            >
              Показать больше
            </button>
          </>
        ) : (
          <p className="profile-visitor-subscribed__friendsEmpty">
            Поки немає друзів
          </p>
        )}
      </section>

      {/* ===== ПОСТИ: під секцією Друзья, як на особистому профілі ===== */}
      <section className="profile-visitor-subscribed__feed feed">
        {MOCK_POSTS.map((post) => (
          <article key={post.id} className="postCard">
            <div className="postTop">
              <div className="postTopLeft">
                <button
                  type="button"
                  className="postAvatarBtn"
                  onClick={() => onViewPhoto?.(displayAvatar)}
                  aria-label="Переглянути фото"
                >
                  <img src={displayAvatar} className="postAvatar" alt="" />
                </button>
                <div className="postHeadText">
                  <div className="postLabel">{post.time}</div>
                  <div className="postAuthor">{displayName}</div>
                </div>
              </div>
              <div className="postTopRight">
                <div className="postLocation">
                  <img
                    className="postLocationIcon"
                    src={profileIcons.location || "/home/location.svg"}
                    alt=""
                  />
                  <span className="postLocationText">{post.location}</span>
                </div>
                <button className="postMoreBtn" type="button" aria-label="more">
                  …
                </button>
              </div>
            </div>
            <p className="postText">{post.text}</p>
            {post.image && (
              <div className="postMedia">
                <div className="postMediaMock" />
              </div>
            )}
            <div className="postActions">
              <button className="postActionBtn" type="button" aria-label="like">
                <img
                  src={profileIcons.like || "/home/like.svg"}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.likes}</span>
              </button>
              <button className="postActionBtn" type="button" aria-label="comment">
                <img
                  src={profileIcons.comments || "/home/comments.svg"}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.comments}</span>
              </button>
              <button className="postActionBtn" type="button" aria-label="save">
                <img
                  src={profileIcons.saved || "/icon1/saved.svg"}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.saved ?? 21}</span>
              </button>
              <button className="postActionBtn" type="button" aria-label="share">
                <img
                  src={profileIcons.share || "/home/to-share.svg"}
                  className="postActionIcon"
                  alt=""
                />
                <span className="postActionCount">{post.shared ?? 60}</span>
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* ===== IMAGE VIEWER ===== */}
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