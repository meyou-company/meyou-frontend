// ProfileHome.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { authApi } from "../../../../services/auth";
import { postsApi } from "../../../../services/postsApi";
import { storiesApi } from "../../../../services/storiesApi";
import {
  isPostImageUploadEnabled,
  uploadPostImage,
} from "../../../../services/postImageUploadApi";

import MessagesNavBadge from "../../../Messages/MessagesNavBadge";
import profileIcons from "../../../../constants/profileIcons";
import { getFriendsCountNumber } from "../../../../utils/profileFriends";
import {
  normalizeFriendListItem,
  getFriendRouteHandle,
  getFriendDisplayLabel,
} from "../../../../utils/profileFriendNav";
import { dedupeAsync } from "../../../../utils/dedupeAsync";
import { mapApiPostToFeedItem } from "../../../../utils/mapApiPostToFeedItem";
import { useProfileAuthorFeed } from "../../../../hooks/useProfileAuthorFeed";
import ProfilePostsFeed from "../ProfilePostsFeed/ProfilePostsFeed";
import ProfileInfoPanel from "../ProfileInfoPanel/ProfileInfoPanel";
import CreatePostModal from "../../../PostFeed/CreatePostModal";
import { getApiErrorMessage } from "../../../../utils/getApiErrorMessage";
import { detectCurrentLocationLabel } from "../../../../utils/postGeolocation";
import StoryViewerModal from "../../../Stories/StoryViewerModal";
import StoryUploadModal from "../../../Stories/StoryUploadModal";
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
  /** Defer posts/stories fetch until profile shell is painted */
  loadSecondary = true,
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const composerTextareaRef = useRef(null);
  const postMediaInputRef = useRef(null);
  const postVideoMediaInputRef = useRef(null);

  const [newPostText, setNewPostText] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [postMediaFiles, setPostMediaFiles] = useState([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [cropModalSrc, setCropModalSrc] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  /** URL фото для перегляду в повному розмірі (null = закрито) */
  const [viewImageUrl, setViewImageUrl] = useState(null);
  const [profileStories, setProfileStories] = useState([]);
  const [profileStoriesLoading, setProfileStoriesLoading] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerStoryIndex, setStoryViewerStoryIndex] = useState(0);
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const {
    feedPosts,
    setFeedPosts,
    feedLoading,
    feedError,
    feedActions,
  } = useProfileAuthorFeed(postsAuthorId, { enabled: loadSecondary });

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

  const myPhotosSectionRef = useRef(null);

  const handleMyPhotos = () => {
    myPhotosSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const username =
    user?.username || user?.nick || user?.nickname || user?.login || "";

  const fullNameReal =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";

  const titleName = username || fullNameReal || t('common.user');
  const displayAvatar = user?.avatarUrl || user?.avatar || "/Logo/photo.png";
  const profileUserId = user?.id || user?._id || postsAuthorId;
  useEffect(() => {
    if (!loadSecondary) return;

    let cancelled = false;

    const loadProfileStories = async () => {
      if (!profileUserId) {
        setProfileStories([]);
        return;
      }

      try {
        setProfileStoriesLoading(true);

        const list = await dedupeAsync(`stories:user:${profileUserId}`, () =>
          storiesApi.getUserStories(profileUserId),
        );

        if (cancelled) return;

        const sortStoriesOldToNew = (stories = []) =>
          [...stories].sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          );

        const normalized = Array.isArray(list?.[0]?.stories)
          ? list[0].stories
          : Array.isArray(list)
            ? list
            : [];

        setProfileStories(sortStoriesOldToNew(normalized));

      } catch (e) {
        if (!cancelled) {
          console.error("[profile stories] failed", e);
          setProfileStories([]);
        }
      } finally {
        if (!cancelled) setProfileStoriesLoading(false);
      }
    };

    loadProfileStories();

    return () => {
      cancelled = true;
    };
  }, [profileUserId, loadSecondary]);
  const hasProfileStories = profileStories.length > 0;

  const profileStoryGroups = hasProfileStories
    ? [
      {
        author: {
          id: profileUserId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username,
          avatarUrl: displayAvatar,
        },
        stories: profileStories,
      },
    ]
    : [];

  const findFirstUnviewedStoryIndex = (stories = []) => {
    const index = stories.findIndex((story) => story?.viewedByMe !== true);
    return index >= 0 ? index : 0;
  };

  const openProfileStories = () => {
    setViewImageUrl(null);
    setStoryViewerStoryIndex(findFirstUnviewedStoryIndex(profileStories));
    setIsStoryViewerOpen(true);
  };

  const composerFirstName =
    (user?.firstName && String(user.firstName).trim()) ||
    (fullNameReal ? fullNameReal.split(/\s+/)[0] : "") ||
    (username || "");
  const composerPlaceholder = composerFirstName
    ? t('posts.placeholderWithName', { name: composerFirstName })
    : t('posts.placeholder');

  const profileLocation =
    [user?.city, user?.country].filter(Boolean).join(", ") || "";
  const bioLine1 = fullNameReal ? `${fullNameReal}.` : "";
  const bioLine2 = profileLocation ? `${profileLocation}.` : "";

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

  const closeComposer = () => {
    setIsComposerOpen(false);
    setIsDetectingLocation(false);
    setLocationPanelOpen(false);
  };

  const handleUseCurrentLocation = async () => {
    if (isDetectingLocation) return;
    setIsDetectingLocation(true);
    try {
      const label = await detectCurrentLocationLabel();
      if (label) {
        setPostLocation(label);
        setLocationPanelOpen(true);
      }
    } catch {
      /* permission denied / unavailable — silent */
    } finally {
      setIsDetectingLocation(false);
    }
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

    if (!trimmedText && postMediaFiles.length === 0) {
      toast.error(t('posts.validation.emptyTextOrPhoto'));
      return;
    }

    try {
      setIsPublishingPost(true);
      const media = [];
      if (postMediaFiles.length > 0) {
        if (!isPostImageUploadEnabled()) {
          toast.info(t('posts.toast.mediaUploadDisabled'));
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
                  ? t('posts.toast.mediaUploadPartial')
                  : details
                    ? `${t('posts.toast.editMediaUploadFileFailed')}: ${details}`
                    : t('posts.toast.mediaUploadFileFailed')
              );
            }
          }
        }
      }

      const locationName = postLocation.trim();
      const created = await postsApi.create({
        fullText: trimmedText || "\u200B",
        media,
        location: locationName || undefined,
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

      toast.success(t('posts.toast.published'));
      setNewPostText("");
      setPostLocation("");
      postMediaFiles.forEach((f) => {
        if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setPostMediaFiles([]);
      closeComposer();
    } catch (err) {
      const msg = getApiErrorMessage(err) || t('posts.toast.publishFailed');
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
          ? t('profile.toast.avatarSessionExpired')
          : getApiErrorMessage(err) || t('profile.toast.avatarSaveError');
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

                <div className={`avatarBorder ${hasProfileStories ? "avatarBorder--hasStories" : ""}`}>
                  <div
                    className="avatarInner avatarInner--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (profileStoriesLoading) return;

                      if (hasProfileStories) {
                        openProfileStories();
                        return;
                      }

                      setViewImageUrl(displayAvatar);
                    }}

                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      if (profileStoriesLoading) return;

                      if (hasProfileStories) {
                        openProfileStories();
                        return;
                      }

                      setViewImageUrl(displayAvatar);
                    }}
                    aria-label={t('profile.viewPhotoFull')}
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
                className={`profileAvatarInfoBtn${isInfoOpen ? " is-active" : ""}`}
                onClick={() => setIsInfoOpen((open) => !open)}
                aria-expanded={isInfoOpen}
                aria-controls="profile-info-panel"
              >
                {isInfoOpen ? t('common.close') : t('profile.tabs.info')}
              </button>
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
              <div className="profileMobileBadges">
                <button
                  type="button"
                  className="profileMobileBadges__btn"
                  onClick={handleMyPhotos}
                  aria-label={t('profile.myPhotos')}
                >
                  <img src={profileIcons.myPhotos} alt="" className="profileMobileBadges__icon" />
                  <span className="profileMobileBadges__label">{t('profile.myPhotos')}</span>
                </button>

                <button type="button" className="profileMobileBadges__btn" onClick={onSaved} aria-label={t('profile.saved')}>
                  <img src={profileIcons.saved} alt="" className="profileMobileBadges__icon" />
                  <span className="profileMobileBadges__label">{t('profile.saved')}</span>
                </button>

                <button type="button" className="profileMobileBadges__btn" onClick={onGifts} aria-label={t('profile.gifts')}>
                  <img src={profileIcons.giftIcon} alt="" className="profileMobileBadges__icon" />
                  <span className="profileMobileBadges__label">{t('profile.gifts')}</span>
                </button>

                <button type="button" className="profileMobileBadges__btn" onClick={onWallet} aria-label={t('profile.myBalance')}>
                  <img src={profileIcons.balance} alt="" className="profileMobileBadges__icon" />
                  <span className="profileMobileBadges__label">{t('profile.myBalance')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="profileRight">
            <div className="profileRight__stack">
              <button
                type="button"
                className="btnMessages btnMessages--inbox"
                onClick={onMessages}
                aria-label={t('profile.myMessages')}
              >
                <span className="btnMessages__iconWrap">
                  <img src={profileIcons.chat} alt="" className="msgIcon" />
                  <MessagesNavBadge />
                </span>
                <span className="msgText">{t('profile.myMessages')}</span>
              </button>
              <button
                type="button"
                className="btnMessages"
                onClick={onGifts}
                aria-label={t('profile.myGifts')}
              >
                <img src={profileIcons.giftIcon} alt="" className="msgIcon" />
                <span className="msgText">{t('profile.myGifts')}</span>
              </button>
              <button
                type="button"
                className="btnMessages btnMessages--desktopExtra"
                onClick={onSaved}
                aria-label={t('profile.saved')}
              >
                <img src={profileIcons.saved} alt="" className="msgIcon" />
                <span className="msgText">{t('profile.saved')}</span>
              </button>
              <button
                type="button"
                className="btnMessages btnMessages--desktopExtra"
                onClick={handleMyPhotos}
                aria-label={t('profile.myPhotos')}
              >
                <img src={profileIcons.myPhotos} alt="" className="msgIcon" />
                <span className="msgText">{t('profile.myPhotos')}</span>
              </button>
            </div>

            <button
              type="button"
              className="btnSaved"
              onClick={onSaved}
              aria-label={t('profile.saved')}
            >
              <img src={profileIcons.saved} alt="" className="msgIcon" />
              <span className="msgText">{t('profile.saved')}</span>
            </button>
          </div>
        </section>

        <ProfileInfoPanel
          user={user}
          isOpen={isInfoOpen}
          editable
          onUserUpdated={refreshMe}
          id="profile-info-panel"
        />

        {/* ================= ACTIONS ================= */}
        <section className="actionsSection">
          <div className="actionsBlock">
            <div className="actionsRowDesktop">
              <button className="actionBtn actionBtnDesktop" type="button" onClick={() => setIsStoryUploadOpen(true)}>
                <span className="actionBtnLeft">
                  <span className="actionRound">
                    <img src={actionIcons.plus} alt="" />
                  </span>
                  <span className="actionLabel actionLabel--mobile">{t('profile.actions.addStoryShort')}</span>
                  <span className="actionLabel actionLabel--desktop">{t('profile.actions.addStory')}</span>
                </span>
                <span className="actionRightDots" aria-hidden="true">•••</span>
              </button>

              <button
                className="actionBtn actionBtnDesktop"
                type="button"
                onClick={() => navigate("/video")}
                aria-label={t('profile.actions.reels')}
              >
                <span className="actionBtnLeft">
                  <span className="actionRound">
                    <img src={actionIcons.video} alt="" />
                  </span>
                  <span className="actionLabel actionLabel--mobile">{t('profile.actions.reels')}</span>
                  <span className="actionLabel actionLabel--desktop">{t('profile.actions.addReels')}</span>
                </span>
              </button>

              <button className="actionBtn actionBtnDesktop" type="button">
                <span className="actionBtnLeft">
                  <span className="actionRound">
                    <img src={actionIcons.video} alt="" />
                  </span>
                  <span className="actionLabel actionLabel--mobile">{t('profile.actions.live')}</span>
                  <span className="actionLabel actionLabel--desktop">{t('profile.actions.liveDesktop')}</span>
                </span>
                <span className="actionRightArrow" aria-hidden="true">›</span>
              </button>
            </div>

            <div className="actionsRow1">
              <button
                className="actionBtn"
                type="button"
                onClick={() => navigate("/video")}
                aria-label={t('profile.actions.reels')}
              >
                <span>{t('profile.actions.reels')}</span>
                <img src={actionIcons.video} alt="" />
              </button>

              <button
                type="button"
                className="actionBtn"
                onClick={onEditProfile}
              >
                <span>{t('profile.editProfile')}</span>
                <img src={actionIcons.pencil} alt="" />
              </button>

              <button className="actionBtn actionMore" type="button" aria-label={t('profile.more')}>
                …
              </button>
            </div>

            <div className="actionsRow2">
              <button className="actionBtn" type="button">
                <span>{t('profile.actions.addStoryShort')}</span>
                <span className="actionPlus">
                  <img src={actionIcons.plus} alt="" />
                </span>
              </button>

              <button className="actionBtn" type="button">
                <span>{t('profile.actions.live')}</span>
                <img src={actionIcons.video} alt="" />
              </button>
            </div>
          </div>
        </section>

        {/* ================= VIP / FRIENDS ================= */}
        <section className="vipCard">
          <div className="friendsTitle">
            <span className="friendsTitle__label">{t('profile.friends.title')}</span>{" "}
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
                            canOpen
                              ? t('profile.friends.profileOf', { name: handle })
                              : t('profile.friends.profileUnavailable')
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
                              canOpen
                                ? t('profile.friends.openProfile', { name: handle })
                                : undefined
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
                {t('profile.friends.viewFriends')}
              </button>
            </>
          ) : (
            <div className="friendsEmpty">
              <button
                type="button"
                className="showMoreBtn"
                onClick={onFindFriends ?? onShowMore}
              >
                {t('profile.friends.findFriends')}
              </button>
            </div>
          )}
        </section>

        {/* ================= NEW POST ================= */}
        <section className="newPost" ref={myPhotosSectionRef} id="profile-my-photos">
          <div className="newPostHead">
            <h3 className="newPostTitle">{t('posts.createTitle')}</h3>
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
        <CreatePostModal
          authorName={titleName}
          displayAvatar={displayAvatar}
          showOnlineDot={user?.online !== false}
          text={newPostText}
          onTextChange={setNewPostText}
          placeholder={t('posts.placeholder')}
          textareaRef={composerTextareaRef}
          postMediaFiles={postMediaFiles}
          onRemoveMedia={removePostMedia}
          postMediaInputRef={postMediaInputRef}
          postVideoInputRef={postVideoMediaInputRef}
          onPhotoSelect={onPostMediaSelect}
          onVideoSelect={onPostMediaSelect}
          postLocation={postLocation}
          onPostLocationChange={setPostLocation}
          onClearLocation={() => setPostLocation("")}
          locationPanelOpen={locationPanelOpen}
          onToggleLocationPanel={() => setLocationPanelOpen((v) => !v)}
          onUseCurrentLocation={handleUseCurrentLocation}
          isDetectingLocation={isDetectingLocation}
          isPublishing={isPublishingPost}
          onPublish={handlePublishPost}
          onClose={closeComposer}
          canPublish={
            Boolean(newPostText.trim()) || postMediaFiles.length > 0
          }
        />
      )}

      {/* Перегляд фото в повному розмірі */}
      {viewImageUrl && (
        <div
          className="profile-home__imageViewer"
          role="dialog"
          aria-modal="true"
          aria-label={t('profile.viewPhotoFull')}
          onClick={() => setViewImageUrl(null)}
        >
          <button
            type="button"
            className="profile-home__imageViewerClose"
            onClick={() => setViewImageUrl(null)}
            aria-label={t('common.close')}
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
      <StoryViewerModal
        isOpen={isStoryViewerOpen}
        groups={profileStoryGroups}
        initialGroupIndex={0}
        initialStoryIndex={storyViewerStoryIndex}
        currentUserId={profileUserId}
        onClose={() => setIsStoryViewerOpen(false)}
        onViewed={() => {
          setProfileStories((prev) =>
            prev.map((story) => ({
              ...story,
              viewedByMe: true,
            }))
          );
        }}
        onDeleteStory={async (storyId) => {
          await storiesApi.deleteStory(storyId);

          setProfileStories((prev) =>
            prev.filter((story) => String(story.id) !== String(storyId))
          );

          setIsStoryViewerOpen(false);
        }}
      />
      <StoryUploadModal
        isOpen={isStoryUploadOpen}
        onClose={() => setIsStoryUploadOpen(false)}
        onCreated={() => {
          setIsStoryUploadOpen(false);
        }}
      />
    </div>
  );
}
