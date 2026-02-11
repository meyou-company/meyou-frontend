// ProfileHome.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { authApi } from "../../../../services/auth";

import profileIcons from "../../../../constants/profileIcons";
import "./ProfileHome.scss";

const MOCK_VIP = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  avatar: i % 3 === 0 ? "/Logo/photo.png" : null,
}));

const MOCK_POSTS = [
  {
    id: 1,
    time: "new post",
    location: "Rimini, Italy",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: true,
    likes: 125,
    comments: 256,
  },
];

export default function ProfileHome({ user, refreshMe }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [newPostText, setNewPostText] = useState("");
  const [cropModalSrc, setCropModalSrc] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const username =
    user?.username || user?.nick || user?.nickname || user?.login || "";

  const fullNameReal =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";

  const titleName = username || fullNameReal || "User";
  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";

  const location = [user?.city, user?.country].filter(Boolean).join(", ") || "";
  const bioLine1 = fullNameReal ? `${fullNameReal}.` : "";
  const bioLine2 = location ? `${location}.` : "";

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
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-home">
      <div className="profile-container">
        {/* ===== TOP PROFILE ===== */}
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
                  <div className="avatarInner">
                    <img src={displayAvatar} alt={titleName} className="avatar" />
                  </div>
                </div>

                <button
                  type="button"
                  className="avatarEdit"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <img src={profileIcons.live} alt="" />
                </button>
              </div>

              <button
                type="button"
                className="editBtn editBtnDesktop"
                onClick={() => navigate("/users/profile/edit")}
              >
                Редактировать профиль
              </button>
            </div>
          </div>

          {/* CENTER: name, bio, badges, actions */}
          <div className="profileInfo">
            <h1 className="name">{titleName}</h1>

            {/* як у тебе: 2 рядки */}
            {bioLine1 && <p className="bio bioName">{bioLine1}</p>}
            {bioLine2 && <p className="bio bioLocation">{bioLine2}</p>}

            {/* badges (у desktop можуть бути hidden через SCSS — не чіпаю) */}
            <div className="badgesRow">
              <button type="button" className="badgeItem" aria-label="my video">
                <img className="badgeIcon" src={profileIcons.video} alt="" />
                <span className="badgeText">my video</span>
              </button>

              <button type="button" className="badgeItem" aria-label="saved">
                <img className="badgeIcon" src={profileIcons.saved} alt="" />
                <span className="badgeText">saved</span>
              </button>

              <button type="button" className="badgeItem" aria-label="my balance">
                <img className="badgeIcon" src={profileIcons.balance} alt="" />
                <span className="badgeText">my balance</span>
              </button>
            </div>

            <div className="actionsBlock">
              {/* mobile rows */}
              <div className="actionsRow1">
                <button className="actionBtn">
                  <span>Дополнить историю</span>
                  <span className="actionPlus">
                    <img src={profileIcons.plus} alt="" />
                  </span>
                </button>

                <button
                  type="button"
                  className="actionBtn"
                  onClick={() => navigate("/users/profile/edit")}
                >
                  <span>Редактировать профиль</span>
                </button>

                <button className="actionBtn actionMore" aria-label="Більше">
                  …
                </button>
              </div>

              <div className="actionsRow2">
                <button className="actionBtn">
                  <span>Добавить рилс</span>
                  <img src={profileIcons.video} alt="" />
                </button>

                <button className="actionBtn">
                  <span>Прямой эфир</span>
                  <img src={profileIcons.live} alt="" />
                </button>
              </div>

              {/* desktop blocks (НЕ ВИДАЛЯЮ) */}
              <button className="actionBtn actionBig">
                <span>Дополнить историю</span>
                <span className="actionPlus">
                  <img src={profileIcons.plus} alt="" />
                </span>
              </button>

              <div className="actionsRow">
                <button className="actionBtn">
                  <span>Добавить рилс</span>
                  <img src={profileIcons.video} alt="" />
                </button>
                <button className="actionBtn">
                  <span>Прямой эфир</span>
                  <img src={profileIcons.live} alt="" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT (desktop) */}
          <div className="profileRight">
          
            <button
              type="button"
              className="btnMessages"
              onClick={() => navigate("/messages")}
              aria-label="My messages"
            >
                <img
  src={profileIcons.chat}
  alt=""
  className="msgIcon"
/>



              <span className="msgText">my messages</span>
            </button>
          </div>
        </section>

        {/* ===== VIP ===== */}
        <section className="vipCard">
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

          <div className="vipDivider" />

          {/* ===== FRIENDS ===== */}
          <div className="friendsTitle">Друзья 0</div>

          <div className="vipRow">
            {MOCK_VIP.slice(0, 7).map((v) => (
              <div key={`f-${v.id}`} className="vipItem">
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

          <button className="showMoreBtn">Показать больше</button>
        </section>

        {/* ===== NEW POST ===== */}
        <section className="newPost">
          <div className="newPostHead">
            <h3 className="newPostTitle">Что у вас нового?</h3>
            <button className="newPostFilter" aria-label="filter">
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

        {/* ===== FEED ===== */}
        <section className="feed">
          {MOCK_POSTS.map((post) => (
            <article key={post.id} className="post">
              <div className="postHeader">
                <img src={displayAvatar} className="postAvatar" alt="" />
                <div className="postMeta">
                  <span className="postAuthor">{titleName}</span>
                  <span className="postTime">{post.time}</span>
                </div>
              </div>

              <p className="postText">{post.text}</p>
              {post.image && <div className="postImage" />}

              <div className="postEngagement">
                <span>♥ {post.likes}</span>
                <span>💬 {post.comments}</span>
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
    </div>
  );
}
