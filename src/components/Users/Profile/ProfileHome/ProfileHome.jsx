// ProfileHome.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { authApi } from "../../../../services/auth";

import profileIcons from "../../../../constants/profileIcons";
import { getFriendsCountNumber } from "../../../../utils/profileFriends";
import "./ProfileHome.scss";

/** Іконки тільки для actionsBlock (чорно-білі SVG) */
const actionIcons = {
  plus: "/icon-black/plus.svg",
  video: "/icon-black/videocamera.svg",
  live: "/icon-black/Group.svg",
  pencil: "/icon-black/pencil.svg",
};

const MOCK_VIP = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  avatar: i % 3 === 0 ? "/Logo/photo.png" : null,
}));

/** Форма друга для відображення в кружечках (підтримка полів з GET /users/:username/followers) */
const toFriendItem = (f) => ({
  id: f?.id ?? f?._id ?? f,
  username: f?.username,
  firstName: f?.firstName,
  lastName: f?.lastName,
  avatar: f?.avatarUrl ?? f?.avatar ?? null,
  isFollowingMe: f?.isFollowingMe === true,
  amIFollowing: f?.amIFollowing === true,
  isFriend: f?.isFriend === true,
  isVip: f?.isVip === true,
});
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



export default function ProfileHome({
  user,
  /** Список з GET /subscriptions/following — для блоку «Друзья» на своєму профілі */
  followingList,
  /** Відкрити профіль користувача за username (клік по аватару друга) */
  onOpenUser,
  /** Відкрити сторінку «Друзі та VIP» (Показать больше) */
  onShowMore,
  /** Відкрити пошук (коли немає друзів — кнопка «Знайти друзів») */
  onFindFriends,
  refreshMe,
  onEditProfile,
  onMessages,
  onSaved,
  onWallet,
}) {
  const fileInputRef = useRef(null);

  const [newPostText, setNewPostText] = useState("");
  const [cropModalSrc, setCropModalSrc] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  /** URL фото для перегляду в повному розмірі (null = закрито) */
  const [viewImageUrl, setViewImageUrl] = useState(null);

  useEffect(() => {
    if (!viewImageUrl) return;
    const onEscape = (e) => e.key === "Escape" && setViewImageUrl(null);
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [viewImageUrl]);

  const username =
    user?.username || user?.nick || user?.nickname || user?.login || "";

  const fullNameReal =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";

  const titleName = username || fullNameReal || "User";
  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";

  const location = [user?.city, user?.country].filter(Boolean).join(", ") || "";
  const bioLine1 = fullNameReal ? `${fullNameReal}.` : "";
  const bioLine2 = location ? `${location}.` : "";

  const friends = useMemo(() => {
    if (Array.isArray(followingList) && followingList.length > 0) {
      return followingList.map(toFriendItem);
    }
    return Array.isArray(user?.friends) ? user.friends.map(toFriendItem) : [];
  }, [followingList, user?.friends]);
  const hasFriends = friends.length > 0;
  /** Загальна кількість друзів з бекенду (friendsCount: { followers, following } або число); інакше — довжина списку */
  const apiCount = getFriendsCountNumber(user?.friendsCount ?? user?.friends_count);
  const displayFriendsCount =
    typeof apiCount === "number" && apiCount >= 0 ? apiCount : friends.length;

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setCropModalSrc(reader.result);
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleAvatarConfirm = async (croppedPixels) => {
    if (!cropModalSrc || !croppedPixels) return;

    try {
      setIsSaving(true);
      const file = await cropImageToFile(cropModalSrc, croppedPixels);
      await authApi.uploadAvatar(file);
      await refreshMe?.();
      setCropModalSrc(null);
      toast.success("Аватар оновлено");
    } catch (err) {
      const raw = err?.response?.data?.message;
      const msg =
        err?.response?.status === 401
          ? "Сесія закінчилась. Увійди знову."
          : (Array.isArray(raw) ? raw[0] : raw) ||
            err?.message ||
            "Не вдалося зберегти фото";
      toast.error(String(msg));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-home">
      <div className="profile-container">
        {/* ================= TOP: avatar + name + badges ================= */}
        <section className="profileBlock">
          {/* LEFT: avatar */}
          <div className="profileLeft">
            <div className="leftStack">
              <div className="avatarWrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="fileInput"
                  onChange={onFileSelect}
                />

                <div className="avatarBorder">
                  <div
                    className="avatarInner avatarInner--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewImageUrl(displayAvatar)}
                    onKeyDown={(e) => e.key === "Enter" && setViewImageUrl(displayAvatar)}
                    aria-label="Переглянути фото в повному розмірі"
                  >
                    <img src={displayAvatar} alt={titleName} className="avatar" />
                  </div>
                </div>

                <button
                  type="button"
                  className="avatarEdit"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  disabled={isSaving}
                >
                  <img src={profileIcons.live} alt="" />
                </button>
              </div>

              <button
                type="button"
                className="editBtn editBtnDesktop"
                onClick={onEditProfile}
              >
                Редактировать профиль
              </button>
            </div>
          </div>

          {/* CENTER: name + bio + badges */}
          <div className="profileInfo">
            <h1 className="name">
              <span className="nameText">{titleName}</span>
            </h1>

            {bioLine1 && <p className="bio bioName">{bioLine1}</p>}
            {bioLine2 && <p className="bio bioLocation">{bioLine2}</p>}

            <div className="badgesRow">
              <button type="button" className="badgeItem" aria-label="my video">
                <img className="badgeIcon" src={profileIcons.video} alt="" />
                <span className="badgeText">my video</span>
              </button>

              <button type="button" className="badgeItem" aria-label="saved">
                <img className="badgeIcon" src={profileIcons.saved} alt="" />
                <span className="badgeText">saved</span>
              </button>

              <button type="button" className="badgeItem" onClick={onWallet} aria-label="my balance">
                <img className="badgeIcon" src={profileIcons.balance} alt="" />
                <span className="badgeText">my balance</span>
              </button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="profileRight">
            <button
              type="button"
              className="btnMessages"
              onClick={onMessages}
              aria-label="My messages"
            >
              <img src={profileIcons.chat} alt="" className="msgIcon" />
              <span className="msgText">my messages</span>
            </button>

            <button
              type="button"
              className="btnSaved"
              onClick={onSaved}
              aria-label="Saved"
            >
              <img src={profileIcons.saved} alt="" className="msgIcon" />
              <span className="msgText">saved</span>
            </button>
          </div>
        </section>

        {/* ================= ACTIONS ================= */}
        <section className="actionsSection">
            <div className="actionsBlock">
              <div className="actionsRow1">
                <button className="actionBtn" type="button">
                  <span>Дополнить историю</span>
                  <span className="actionPlus">
                    <img src={actionIcons.plus} alt="" />
                  </span>
                </button>

                <button
                  type="button"
                  className="actionBtn"
                  onClick={onEditProfile}
                >
                  <span>Редактировать профиль</span>
                  <img src={actionIcons.pencil} alt="" />
                </button>

                <button className="actionBtn actionMore" type="button" aria-label="Більше">
                  …
                </button>
              </div>

              <div className="actionsRow2">
                <button className="actionBtn" type="button">
                  <span>Добавить рилс</span>
                  <img src={actionIcons.video} alt="" />
                </button>

                <button className="actionBtn" type="button">
                  <span>Прямой эфир</span>
                  <img src={actionIcons.live} alt="" />
                </button>
              </div>

              <button className="actionBtn actionBig" type="button">
                <span>Дополнить историю</span>
                <span className="actionPlus">
                  <img src={actionIcons.plus} alt="" />
                </span>
              </button>

              <div className="actionsRow">
                <button className="actionBtn" type="button">
                  <span>Добавить рилс</span>
                  <img src={actionIcons.video} alt="" />
                </button>
                <button className="actionBtn" type="button">
                  <span>Прямой эфир</span>
                  <img src={actionIcons.live} alt="" />
                </button>
              </div>
            </div>
          </section>

        {/* ================= VIP / FRIENDS ================= */}
        <section className="vipCard">
          {hasFriends && (
            <>
              <div className="vipHeader">
                <span className="vipTitle">VIP 👑 0</span>
              </div>
              <div className="vipRow">
              {MOCK_VIP.map((v) => (
                <div key={v.id} className="vipItem">
                  <div className="vipAvatarWrap">
                    <img
                      src={v.avatar || "/icon1/image0.png"}
                      className="vipAvatar"
                      alt=""
                    />
                    <span className="onlineDot" />
                  </div>
                </div>
              ))}
              </div>
            </>
          )}

          {hasFriends && <div className="vipDivider" />}

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
                      <img
                        src={v.avatar || "/icon1/image0.png"}
                        className="vipAvatar"
                        alt=""
                      />
                      <span className="onlineDot" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="showMoreBtn"
                type="button"
                onClick={onShowMore}
              >
                Показать больше
              </button>
            </>
          ) : (
            <button
              type="button"
              className="showMoreBtn"
              onClick={onFindFriends ?? onShowMore}
            >
              Показать больше
            </button>
          )}
        </section>

        {/* ================= NEW POST ================= */}
        <section className="newPost">
          <div className="newPostHead">
            <h3 className="newPostTitle">Что у вас нового?</h3>
            <button className="newPostFilter" type="button" aria-label="filter">
              ☰
            </button>
          </div>

          <textarea
            className="postInput"
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Lorem ipsum dolor sit amet..."
          />
        </section>

        {/* ================= FEED ================= */}
<section className="feed">
  {MOCK_POSTS.map((post) => (
    <article key={post.id} className="postCard">
      {/* TOP ROW */}
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

      {/* TEXT */}
      <p className="postText">{post.text}</p>

      {/* IMAGE */}
      {post.image && (
        <div className="postMedia">
          {/* якщо потім буде реальне фото -> заміниш на <img src=... /> */}
          <div className="postMediaMock" />
        </div>
      )}

      {/* ACTIONS */}
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


      </div>

      {cropModalSrc && (
        <AvatarCropModal
          src={cropModalSrc}
          onClose={() => setCropModalSrc(null)}
          onConfirm={handleAvatarConfirm}
        />
      )}

      {/* Перегляд фото в повному розмірі */}
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
