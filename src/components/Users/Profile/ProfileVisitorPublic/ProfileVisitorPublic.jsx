/** Чужий профіль без підписки */
import { useEffect, useMemo, useState } from "react";
import profileIcons from "../../../../constants/profileIcons";
import { getFriendsCountNumber } from "../../../../utils/profileFriends";
import "../ProfileHome/ProfileHome.scss";
import "./ProfileVisitorPublic.scss";

const TABS_VISITOR_NOT_SUB = [
  { id: "info", label: "Информация", locked: false },
  { id: "stories", label: "Истории", locked: false },
  { id: "video", label: "Видео", locked: true },
  { id: "photo", label: "Фото", locked: true },
];

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
    shares: 60,
  },
];

/** Форма друга для відображення в кружечках */
const toFriendItem = (f) => ({
  id: f?.id ?? f?._id ?? f,
  username: f?.username,
  firstName: f?.firstName,
  lastName: f?.lastName,
  avatar: f?.avatarUrl ?? f?.avatar ?? null,
});

/**
 * Public (non-subscribed) visitor profile view.
 * Renders: visitor top section, tabs, subscribe/block/report/add-to-vip actions, friends preview, feed.
 */
export default function ProfileVisitorPublic({
  user,
  onSubscribe,
  subscriptionLoading,
  onOpenUser,
  onShowMore,
  onFindFriends,
  onReport,
  onAddToVip,
  onBlock,
}) {
  const [visitorTab, setVisitorTab] = useState("info");
  const [viewImageUrl, setViewImageUrl] = useState(null);

  useEffect(() => {
    if (!viewImageUrl) return;
    const onEscape = (e) => e.key === "Escape" && setViewImageUrl(null);
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [viewImageUrl]);

  const username = user?.username || user?.nick || user?.nickname || user?.login || "";
  const fullNameReal = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";
  const titleName = username || fullNameReal || "User";
  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";
  const location = [user?.city, user?.country].filter(Boolean).join(", ") || "";
  const bioLine1 = fullNameReal ? `${fullNameReal}.` : "";
  const bioLine2 = location ? `${location}.` : "";

  const friends = useMemo(
    () => (Array.isArray(user?.friends) ? user.friends.map(toFriendItem) : []),
    [user?.friends]
  );
  const hasFriends = friends.length > 0;
  const apiCount = getFriendsCountNumber(user?.friendsCount ?? user?.friends_count);
  const displayFriendsCount = typeof apiCount === "number" && apiCount >= 0 ? apiCount : friends.length;

  return (
    <div className="profile-visitor-public profile-home">
      <div className="profile-container">
        {/* ================= TOP: visitor avatar + name + actions ================= */}
        <section className="profileBlock profileBlock--visitorNotSub">
          <div className="profileLeft">
            <div className="ph-visitor-avatarBlock">
              <div
                className="ph-visitor-avatarWrap"
                role="button"
                tabIndex={0}
                onClick={() => setViewImageUrl(displayAvatar)}
                onKeyDown={(e) => e.key === "Enter" && setViewImageUrl(displayAvatar)}
                aria-label="Переглянути фото"
              >
                <img src={displayAvatar} alt={titleName} className="avatar" />
              </div>
              <span className="ph-visitor-onlineDot" aria-hidden="true" />
              <p className="ph-visitor-onlineLabel">Online</p>
            </div>
          </div>
          <div className="ph-visitor-right">
            <div className="ph-visitor-name-row">
              <h1 className="ph-visitor-name">{titleName}</h1>
              <div className="ph-visitor-tools">
                <button
                  type="button"
                  className="ph-visitor-tools__report"
                  onClick={onReport}
                  aria-label="Пожаловаться"
                >
                  <span className="ph-visitor-tools__reportIconWrap" aria-hidden="true" />
                  <span className="ph-visitor-tools__reportLabel">Пожаловаться</span>
                </button>
                <button
                  type="button"
                  className="ph-visitor-tools__vip"
                  onClick={onAddToVip}
                  aria-label="Добавить в VIP"
                >
                  <span className="ph-visitor-tools__vipText">Добавить в VIP</span>
                  <img src={profileIcons.vipButton} alt="" className="ph-visitor-tools__vipIcon" />
                </button>
              </div>
            </div>
            {(bioLine1 || bioLine2) && (
              <div className="ph-visitor-bio">
                {bioLine1 && (
                  <p className="ph-visitor-bio__line">
                    {bioLine1.split(/(\s+)/).map((part, i) =>
                      /\s/.test(part) ? part : <span key={i} className="ph-visitor-bio__word">{part}</span>
                    )}
                  </p>
                )}
                {bioLine2 && (
                  <p className="ph-visitor-bio__line">
                    {bioLine2.split(/(\s+)/).map((part, i) =>
                      /\s/.test(part) ? part : <span key={i} className="ph-visitor-bio__word">{part}</span>
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="ph-visitor-actions">
              <button
                type="button"
                className="ph-visitor-actions__subscribe"
                onClick={onSubscribe}
                disabled={subscriptionLoading}
              >
                {subscriptionLoading ? "…" : "Подписаться"}
              </button>
              <button
                type="button"
                className="ph-visitor-actions__block"
                onClick={onBlock}
                aria-label="Заблокировать"
              >
                Заблокировать
              </button>
            </div>
          </div>
        </section>

        {/* ================= TABS ================= */}
        <section className="ph-visitor-tabs" role="tablist" aria-label="Табы профиля">
          {TABS_VISITOR_NOT_SUB.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={visitorTab === tab.id}
              aria-disabled={tab.locked}
              className={`ph-visitor-tabs__tab${visitorTab === tab.id ? " is-active" : ""}${tab.locked ? " is-locked" : ""}`}
              onClick={() => !tab.locked && setVisitorTab(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.locked && (
                <img src={profileIcons.lockBlack} alt="" className="ph-visitor-tabs__lock" aria-hidden />
              )}
            </button>
          ))}
        </section>

        {/* ================= FRIENDS ================= */}
        <section className="vipCard">
          <div className="friendsTitle">Друзья {displayFriendsCount}</div>
          {hasFriends ? (
            <>
              <div className="vipRow">
                {friends.slice(0, 7).map((v) => (
                  <div key={v.id} className="vipItem">
                    <button
                      type="button"
                      className="vipAvatarWrap vipAvatarWrap--clickable"
                      onClick={() => v.username && onOpenUser?.(v.username)}
                      aria-label={v.username ? `Профіль ${v.username}` : "Користувач"}
                    >
                      <img src={v.avatar || "/icon1/image0.png"} className="vipAvatar" alt="" />
                      <span className="onlineDot" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="showMoreBtn" onClick={onShowMore}>
                Показать больше
              </button>
            </>
          ) : (
            <button type="button" className="showMoreBtn" onClick={onFindFriends ?? onShowMore}>
              Показать больше
            </button>
          )}
        </section>

        {/* ================= FEED ================= */}
        <section className="feed">
          {MOCK_POSTS.map((post) => (
            <article key={post.id} className="postCard">
              <div className="postTop">
                <div className="postTopLeft">
                  <button
                    type="button"
                    className="postAvatarBtn"
                    onClick={() => setViewImageUrl(displayAvatar)}
                    aria-label="Переглянути фото"
                  >
                    <img src={displayAvatar} className="postAvatar" alt="" />
                  </button>
                  <div className="postHeadText">
                    <div className="postLabel">new post</div>
                    <div className="postAuthor">{titleName}</div>
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
                  <img src={profileIcons.like || "/home/like.svg"} className="postActionIcon" alt="" />
                  <span className="postActionCount">{post.likes}</span>
                </button>
                <button className="postActionBtn" type="button" aria-label="comment">
                  <img src={profileIcons.comments || "/home/comments.svg"} className="postActionIcon" alt="" />
                  <span className="postActionCount">{post.comments}</span>
                </button>
                <button className="postActionBtn" type="button" aria-label="save">
                  <img src={profileIcons.saved || "/icon1/saved.svg"} className="postActionIcon" alt="" />
                  <span className="postActionCount">{post.saved ?? 21}</span>
                </button>
                <button className="postActionBtn" type="button" aria-label="share">
                  <img src={profileIcons.share || "/home/to-share.svg"} className="postActionIcon" alt="" />
                  <span className="postActionCount">{post.shares ?? 60}</span>
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>

      {viewImageUrl && (
        <div
          className="profile-home__imageViewer"
          role="dialog"
          aria-modal="true"
          aria-label="Фото в повному розмірі"
          onClick={() => setViewImageUrl(null)}
        >
          <button
            type="button"
            className="profile-home__imageViewerClose"
            onClick={() => setViewImageUrl(null)}
            aria-label="Закрити"
          >
            ×
          </button>
          <img
            src={viewImageUrl}
            alt=""
            className="profile-home__imageViewerImg"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
