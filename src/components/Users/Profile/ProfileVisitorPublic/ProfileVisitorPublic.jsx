/** Чужий профіль без підписки */
import { useEffect, useMemo, useRef, useState } from "react";
import profileIcons from "../../../../constants/profileIcons";
import { getFriendsCountNumber } from "../../../../utils/profileFriends";
import {
  normalizeFriendListItem,
  getFriendRouteHandle,
  getFriendDisplayLabel,
} from "../../../../utils/profileFriendNav";
import { useProfileAuthorFeed } from "../../../../hooks/useProfileAuthorFeed";
import ProfilePostsFeed from "../ProfilePostsFeed/ProfilePostsFeed";
import "../ProfileHome/ProfileHome.scss";
import "./ProfileVisitorPublic.scss";

const TABS_VISITOR_NOT_SUB = [
  { id: "info", label: "Информация", locked: false },
  { id: "stories", label: "Истории", locked: false },
  { id: "video", label: "Видео", locked: true },
  { id: "photo", label: "Фото", locked: true },
];

/**
 * Public (non-subscribed) visitor profile view.
 * Renders: visitor top section, tabs, subscribe/block/report/add-to-vip actions, friends preview, feed.
 */
export default function ProfileVisitorPublic({
  user,
  postsAuthorId,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (!viewImageUrl) return;
    const onEscape = (e) => e.key === "Escape" && setViewImageUrl(null);
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [viewImageUrl]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onPointerDown = (e) => {
      if (!mobileMenuRef.current?.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const onEscape = (e) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isMobileMenuOpen]);

  const username = user?.username || user?.nick || user?.nickname || user?.login || "";
  const fullNameReal = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";
  const titleName = username || fullNameReal || "User";
  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";
  const location = [user?.city, user?.country].filter(Boolean).join(", ") || "";
  const bioLine1 = fullNameReal ? `${fullNameReal}.` : "";
  const bioLine2 = location ? `${location}.` : "";

  const friends = useMemo(() => {
    if (!Array.isArray(user?.friends)) return [];
    return user.friends.map(normalizeFriendListItem).filter(Boolean);
  }, [user?.friends]);

  const openFriendProfile = (f) => {
    const h = getFriendRouteHandle(f);
    if (h) onOpenUser?.(h);
  };
  const hasFriends = friends.length > 0;
  const apiCount = getFriendsCountNumber(user?.friendsCount ?? user?.friends_count);
  const displayFriendsCount =
    typeof apiCount === "number" && apiCount >= 0
      ? apiCount
      : Array.isArray(user?.friends)
        ? user.friends.length
        : 0;

  const authorId = postsAuthorId ?? user?.id ?? user?._id;
  const { feedPosts, feedLoading, feedError, feedActions } =
    useProfileAuthorFeed(authorId);

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
              <button
                type="button"
                className={`ph-visitor-avatarInfoBtn${visitorTab === "info" ? " is-active" : ""}`}
                onClick={() => setVisitorTab("info")}
              >
                Информация
              </button>
            </div>
          </div>
          <div className="ph-visitor-right">
            <div className="ph-visitor-identity">
              <h1 className="ph-visitor-name">{titleName}</h1>
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
            </div>
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
              className="ph-visitor-actions__block"
              onClick={onBlock}
              aria-label="Заблокировать"
            >
              Заблокировать
            </button>
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
              className="ph-visitor-tools__vip"
              onClick={onAddToVip}
              aria-label="Добавить в VIP"
            >
              <span className="ph-visitor-tools__vipText">Добавить в VIP</span>
              <img src={profileIcons.vipButton} alt="" className="ph-visitor-tools__vipIcon" />
            </button>
          </div>
          <section className="ph-visitor-tabs ph-visitor-tabs--desktop" role="tablist" aria-label="Табы профиля">
            {TABS_VISITOR_NOT_SUB.filter((tab) => tab.id !== "info").map((tab) => (
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
        </section>

        <section className="ph-visitor-mobileActions" aria-label="Действия профиля">
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
            className="ph-visitor-tools__vip"
            onClick={onAddToVip}
            aria-label="Добавить в VIP"
          >
            <span className="ph-visitor-tools__vipText">Добавить в VIP</span>
            <img src={profileIcons.vipButton} alt="" className="ph-visitor-tools__vipIcon" />
          </button>
          <div className="ph-visitor-tools__mobileMenuWrap" ref={mobileMenuRef}>
            <button
              type="button"
              className="ph-visitor-tools__more"
              aria-label="Больше действий"
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className="ph-visitor-tools__moreDots" aria-hidden="true">•••</span>
            </button>
            {isMobileMenuOpen && (
              <div className="ph-visitor-mobileMenu" role="menu" aria-label="Действия профиля">
                <button
                  type="button"
                  className="ph-visitor-mobileMenu__item"
                  role="menuitem"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onBlock?.();
                  }}
                >
                  <img src={profileIcons.lockBlack} alt="" className="ph-visitor-mobileMenu__icon" aria-hidden="true" />
                  <span>Заблокировать</span>
                </button>
                <button
                  type="button"
                  className="ph-visitor-mobileMenu__item"
                  role="menuitem"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onReport?.();
                  }}
                >
                  <img src={profileIcons.complaints} alt="" className="ph-visitor-mobileMenu__icon" aria-hidden="true" />
                  <span>Пожаловаться</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ================= FRIENDS ================= */}
        <section className="vipCard">
          <div className="friendsTitle">
            <span className="friendsTitle__label">Друзья</span>{" "}
            <span className="friendsTitle__count">{displayFriendsCount}</span>
          </div>
          {hasFriends ? (
            <>
              <div className="vipRow">
                {friends.slice(0, 7).map((v) => {
                  const handle = getFriendRouteHandle(v);
                  const canOpen = Boolean(handle);
                  const label = getFriendDisplayLabel(v);
                  return (
                    <div key={v.id} className="vipItem">
                      <div className="vipFriendCell">
                        <button
                          type="button"
                          className="vipAvatarWrap vipAvatarWrap--clickable"
                          onClick={() => openFriendProfile(v)}
                          disabled={!canOpen}
                          aria-label={
                            canOpen ? `Профіль ${handle}` : "Профіль недоступний"
                          }
                        >
                          <img
                            src={v.avatar || "/icon1/image0.png"}
                            className="vipAvatar"
                            alt=""
                          />
                          <span className="onlineDot" />
                        </button>
                        {(label || canOpen) && (
                          <button
                            type="button"
                            className="vipFriendNameBtn"
                            onClick={() => openFriendProfile(v)}
                            disabled={!canOpen}
                            aria-label={
                              canOpen ? `Відкрити профіль ${handle}` : undefined
                            }
                          >
                            <img
                              src={profileIcons.friends}
                              alt=""
                              className="vipFriendNameIcon"
                              aria-hidden="true"
                            />
                            <span className="vipFriendNameText">
                              {label || handle || "—"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

        {/* ================= TABS ================= */}
        <section className="ph-visitor-tabs ph-visitor-tabs--mobile" role="tablist" aria-label="Табы профиля">
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

        <ProfilePostsFeed
          feedPosts={feedPosts}
          feedLoading={feedLoading}
          feedError={feedError}
          feedActions={feedActions}
          displayAvatar={displayAvatar}
          titleName={titleName}
          onViewProfileAvatar={() => setViewImageUrl(displayAvatar)}
        />
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
