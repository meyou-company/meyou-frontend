// ProfileHome.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { authApi } from "../../../../services/auth";
import { postsApi } from "../../../../services/postsApi";
import {
  isPostImageUploadEnabled,
  uploadPostImage,
} from "../../../../services/postImageUploadApi";

import profileIcons from "../../../../constants/profileIcons";
import { getFriendsCountNumber } from "../../../../utils/profileFriends";
import {
  normalizeFriendListItem,
  getFriendRouteHandle,
  getFriendDisplayLabel,
} from "../../../../utils/profileFriendNav";
import { mapApiPostToFeedItem } from "../../../../utils/mapApiPostToFeedItem";
import { useProfileAuthorFeed } from "../../../../hooks/useProfileAuthorFeed";
import ProfilePostsFeed from "../ProfilePostsFeed/ProfilePostsFeed";
import { getApiErrorMessage } from "../../../../utils/getApiErrorMessage";
import "./ProfileHome.scss";

/** Іконки тільки для actionsBlock (чорно-білі SVG) */
const actionIcons = {
  plus: "/icon-black/plus.svg",
  video: "/icon-black/videocamera.svg",
  pencil: "/icon-black/pencil.svg",
};

export default function ProfileHome({
  user,
  /** User id whose posts to show — must match profile owner (GET /posts/users/:id/posts) */
  postsAuthorId,
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
  onGifts,
  onSaved,
  onWallet,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const postMediaInputRef = useRef(null);

  const [newPostText, setNewPostText] = useState("");
  const [postMediaFiles, setPostMediaFiles] = useState([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [cropModalSrc, setCropModalSrc] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  /** URL фото для перегляду в повному розмірі (null = закрито) */
  const [viewImageUrl, setViewImageUrl] = useState(null);

  const {
    feedPosts,
    setFeedPosts,
    feedLoading,
    feedError,
    feedActions,
  } = useProfileAuthorFeed(postsAuthorId);

  useEffect(() => {
    if (!viewImageUrl) return;
    const onEscape = (e) => e.key === "Escape" && setViewImageUrl(null);
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [viewImageUrl]);

  useEffect(() => {
    return () => {
      postMediaFiles.forEach((f) => {
        if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [postMediaFiles]);

  const username =
    user?.username || user?.nick || user?.nickname || user?.login || "";

  const fullNameReal =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";

  const titleName = username || fullNameReal || "User";
  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";

  const composerFirstName =
    (user?.firstName && String(user.firstName).trim()) ||
    (fullNameReal ? fullNameReal.split(/\s+/)[0] : "") ||
    (username || "");
  const composerPlaceholder = composerFirstName
    ? `Що у вас нового, ${composerFirstName}?`
    : "Що у вас нового?";

  const location = [user?.city, user?.country].filter(Boolean).join(", ") || "";
  const bioLine1 = fullNameReal ? `${fullNameReal}.` : "";
  const bioLine2 = location ? `${location}.` : "";

  const friends = useMemo(() => {
    if (Array.isArray(followingList) && followingList.length > 0) {
      return followingList.map(normalizeFriendListItem).filter(Boolean);
    }
    return Array.isArray(user?.friends)
      ? user.friends.map(normalizeFriendListItem).filter(Boolean)
      : [];
  }, [followingList, user?.friends]);

  const openFriendProfile = (f) => {
    const h = getFriendRouteHandle(f);
    if (h) onOpenUser?.(h);
  };
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

  const onPostMediaSelect = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setPostMediaFiles((prev) => {
      const next = files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        type: file.type.startsWith("video/") ? "video" : "image",
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });

    e.target.value = "";
  };

  const removePostMedia = (id) => {
    setPostMediaFiles((prev) => {
      const fileToRemove = prev.find((item) => item.id === id);
      if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handlePublishPost = async () => {
    const trimmedText = newPostText.trim();
    if (!trimmedText) {
      toast.error("Введіть текст поста");
      return;
    }

    try {
      setIsPublishingPost(true);
      const media = [];
      if (postMediaFiles.length > 0) {
        if (!isPostImageUploadEnabled()) {
          toast.info(
            "Завантаження медіа тимчасово недоступне. Пост буде опубліковано лише з текстом."
          );
        } else {
          for (const [index, item] of postMediaFiles.entries()) {
            if (!item?.file) continue;
            try {
              const url = await uploadPostImage(item.file);
              media.push({
                url,
                type: item.file.type?.startsWith("video") ? "VIDEO" : "IMAGE",
                order: index,
              });
            } catch (uploadErr) {
              const status = uploadErr?.response?.status;
              const isUnavailable =
                status === 404 || status === 405 || status === 501;
              const details = getApiErrorMessage(uploadErr);
              console.error("[post-media-upload] failed", {
                status,
                details,
                raw: uploadErr,
              });
              toast.warning(
                isUnavailable
                  ? "Завантаження медіа тимчасово недоступне. Частина файлів не додана."
                  : details
                    ? `Не вдалося завантажити файл: ${details}`
                    : "Не вдалося завантажити один із файлів. Пост опубліковано без нього."
              );
            }
          }
        }
      }

      const created = await postsApi.create({
        fullText: trimmedText,
        media,
        location: location || undefined,
        visibility: "PUBLIC",
      });

      const feedItem = mapApiPostToFeedItem(created);
      const createdAuthorId = created?.author?.id;
      const belongsOnThisProfile =
        !postsAuthorId ||
        !createdAuthorId ||
        createdAuthorId === postsAuthorId;
      if (feedItem && belongsOnThisProfile) {
        setFeedPosts((prev) => {
          const withoutDup = prev.filter((p) => p.id !== feedItem.id);
          return [feedItem, ...withoutDup];
        });
      }
      // Also inject new post into global first-page cache so it appears at the top there.
      if (feedItem && typeof window !== "undefined") {
        try {
          const key = "first-page-feed-cache";
          const raw = window.localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : [];
          const prevList = Array.isArray(parsed) ? parsed : [];
          const withoutDup = prevList.filter((p) => String(p?.id) !== String(feedItem.id));
          const next = [feedItem, ...withoutDup].sort(
            (a, b) =>
              new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
          );
          window.localStorage.setItem(key, JSON.stringify(next.slice(0, 100)));
        } catch {
          // ignore cache write errors
        }
      }

      toast.success("Пост опубліковано");
      setNewPostText("");
      postMediaFiles.forEach((f) => {
        if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setPostMediaFiles([]);
      setIsComposerOpen(false);
    } catch (err) {
      const msg = getApiErrorMessage(err) || "Не вдалося опублікувати пост";
      toast.error(String(msg));
    } finally {
      setIsPublishingPost(false);
    }
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
      const msg =
        err?.response?.status === 401
          ? "Сесія закінчилась. Увійди знову."
          : getApiErrorMessage(err) || "Не вдалося зберегти фото";
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

            </div>
          </div>

          {/* CENTER: name + bio + badges */}
          <div className="profileInfo">
            <h1 className="name">
              <span className="nameText">{titleName}</span>
            </h1>

            <div className="profileBioWrap">
              {bioLine1 && <p className="bio bioName">{bioLine1}</p>}
              {bioLine2 && <p className="bio bioLocation">{bioLine2}</p>}
            </div>

            <div className="profileInfoAside">
              <div className="badgesRow">
                <button type="button" className="badgeItem" onClick={onWallet} aria-label="Мій баланс">
                  <img className="badgeIcon" src={profileIcons.balance} alt="" />
                  <span className="badgeText">Мій баланс</span>
                </button>

                <button type="button" className="badgeItem" onClick={onSaved} aria-label="Збережені">
                  <img className="badgeIcon" src={profileIcons.saved} alt="" />
                  <span className="badgeText">Збережені</span>
                </button>
              </div>

              <div className="profileMobileGifts">
                <button type="button" className="profileMobileGifts__btn" onClick={onGifts} aria-label="Подарунки">
                  <img src={profileIcons.giftIcon} alt="" className="profileMobileGifts__icon" />
                  <span className="profileMobileGifts__label">Подарунки</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="profileRight">
            <div className="profileRight__stack">
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
                className="btnMessages"
                onClick={onGifts}
                aria-label="My gifts"
              >
                <img src={profileIcons.giftIcon} alt="" className="msgIcon" />
                <span className="msgText">my gifts</span>
              </button>
            </div>

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
            <div className="actionsRowDesktop">
              <button className="actionBtn actionBtnDesktop" type="button">
                <span className="actionBtnLeft">
                  <span className="actionRound">
                    <img src={actionIcons.plus} alt="" />
                  </span>
                  <span className="actionLabel actionLabel--mobile">Історія</span>
                  <span className="actionLabel actionLabel--desktop">Доповнити історію</span>
                </span>
                <span className="actionRightDots" aria-hidden="true">•••</span>
              </button>

              <button
                className="actionBtn actionBtnDesktop"
                type="button"
                onClick={() => navigate("/video")}
                aria-label="Відео, рілси"
              >
                <span className="actionBtnLeft">
                  <span className="actionRound">
                    <img src={actionIcons.video} alt="" />
                  </span>
                  <span className="actionLabel actionLabel--mobile">Reels</span>
                  <span className="actionLabel actionLabel--desktop">Додати рілс</span>
                </span>
              </button>

              <button className="actionBtn actionBtnDesktop" type="button">
                <span className="actionBtnLeft">
                  <span className="actionRound">
                    <img src={actionIcons.video} alt="" />
                  </span>
                  <span className="actionLabel actionLabel--mobile">Ефір</span>
                  <span className="actionLabel actionLabel--desktop">Прямий ефір</span>
                </span>
                <span className="actionRightArrow" aria-hidden="true">›</span>
              </button>
            </div>

            <div className="actionsRow1">
              <button
                className="actionBtn"
                type="button"
                onClick={() => navigate("/video")}
                aria-label="Відео, рілси"
              >
                <span>Reels</span>
                <img src={actionIcons.video} alt="" />
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
                <span>Історія</span>
                <span className="actionPlus">
                  <img src={actionIcons.plus} alt="" />
                </span>
              </button>

              <button className="actionBtn" type="button">
                <span>Ефір</span>
                <img src={actionIcons.video} alt="" />
              </button>
            </div>
          </div>
        </section>

        {/* ================= VIP / FRIENDS ================= */}
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
              <button
                className="showMoreBtn"
                type="button"
                onClick={onShowMore}
              >
                Переглянути друзів
              </button>
            </>
          ) : (
            <div className="friendsEmpty">
              <button
                type="button"
                className="showMoreBtn"
                onClick={onFindFriends ?? onShowMore}
              >
                Знайти друзів
              </button>
            </div>
          )}
        </section>

        {/* ================= NEW POST ================= */}
        <section className="newPost">
          <div className="newPostHead">
            <h3 className="newPostTitle">Створити допис</h3>
          </div>

          <button
            type="button"
            className="postInputTrigger"
            onClick={() => setIsComposerOpen(true)}
          >
            {composerPlaceholder}
          </button>
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

      {cropModalSrc && (
        <AvatarCropModal
          src={cropModalSrc}
          onClose={() => setCropModalSrc(null)}
          onConfirm={handleAvatarConfirm}
        />
      )}

      {isComposerOpen && (
        <div
          className="composerModal"
          role="dialog"
          aria-modal="true"
          aria-label="Створити допис"
          onClick={() => setIsComposerOpen(false)}
        >
          <div className="composerCard" onClick={(e) => e.stopPropagation()}>
            <div className="composerHeader">
              <h3 className="composerTitle" id="composer-dialog-title">
                Створити допис
              </h3>
              <button
                type="button"
                className="composerClose"
                onClick={() => setIsComposerOpen(false)}
                aria-label="Закрити"
              >
                ×
              </button>
            </div>

            <div className="composerInputShell">
              <div className="composerAvatarRing" aria-hidden="true">
                <img src={displayAvatar} alt="" className="composerAvatarImg" />
                <span className="composerAvatarStatus" />
              </div>
              <textarea
                className="postInput composerTextarea"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder={composerPlaceholder}
                aria-labelledby="composer-dialog-title"
              />
            </div>

            <input
              ref={postMediaInputRef}
              type="file"
              accept="image/*"
              multiple
              className="postMediaInput"
              onChange={onPostMediaSelect}
            />

            {postMediaFiles.length > 0 && (
              <div className="postMediaPreviewGrid">
                {postMediaFiles.map((media) => (
                  <div key={media.id} className="postMediaPreviewItem">
                    {media.type === "video" ? (
                      <video src={media.previewUrl} className="postMediaPreview" controls />
                    ) : (
                      <img src={media.previewUrl} alt="" className="postMediaPreview" />
                    )}
                    <button
                      type="button"
                      className="removeMediaBtn"
                      onClick={() => removePostMedia(media.id)}
                      aria-label="Видалити файл"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="composerActions">
              <button
                type="button"
                className="composerActionBtn"
                onClick={() => postMediaInputRef.current?.click()}
              >
                <img
                  src={profileIcons.live}
                  alt=""
                  className="composerActionIcon"
                  aria-hidden="true"
                />
                <span>Фото</span>
              </button>

              <div className="newPostActions">
                <button
                  type="button"
                  className="publishBtn"
                  disabled={
                    isPublishingPost || (!newPostText.trim() && postMediaFiles.length === 0)
                  }
                  onClick={handlePublishPost}
                  aria-label="Опублікувати"
                >
                  {isPublishingPost ? "Публікуємо..." : "Опублікувати"}
                </button>
              </div>
            </div>
          </div>
        </div>
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
