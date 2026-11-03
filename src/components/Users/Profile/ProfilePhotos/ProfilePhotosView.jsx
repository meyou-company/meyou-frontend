import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import CreatePostModal from "../../../PostFeed/CreatePostModal";
import SharePostModal from "../../../PostFeed/SharePostModal";
import { authApi } from "../../../../services/auth";
import { postsApi } from "../../../../services/postsApi";
import { conversationsApi } from "../../../../services/conversationsApi";
import { uploadPostImage } from "../../../../services/postImageUploadApi";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { getApiErrorMessage } from "../../../../utils/getApiErrorMessage";
import { mapApiPostToFeedItem } from "../../../../utils/mapApiPostToFeedItem";
import { downloadPhoto } from "../../../../utils/photoViewerActions";
import profileIcons from '../../../../constants/profileIcons';
import { getOwnerVipEnabled } from '../../../../utils/profileVipUi';
import { DEFAULT_AVATAR } from "../../../../constants/brand";
import "./ProfilePhotosView.scss";

function getTimestamp(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function sortPhotosNewestFirst(items) {
  return [...items].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
}

function normalizePostImages(post) {
  const mapped = mapApiPostToFeedItem(post);
  const rawMedia = Array.isArray(post?.media) ? post.media : [];
  const media = Array.isArray(mapped?.media) ? mapped.media : [];

  return media
    .map((item, index) => {
      if (item?.type !== "IMAGE" || !item?.url) return null;
      return {
        id: `post-${mapped?.id || post?.id}-${index}-${item.url}`,
        type: "post",
        url: item.url,
        postId: mapped?.id || post?.id,
        post,
        visibility: String(post?.visibility || mapped?.visibility || "PUBLIC").toUpperCase(),
        mediaIndex: index,
        rawMediaItem: rawMedia[index],
        createdAt:
          rawMedia[index]?.createdAt ||
          rawMedia[index]?.created_at ||
          rawMedia[index]?.uploadedAt ||
          rawMedia[index]?.uploaded_at ||
          mapped?.createdAt ||
          post?.createdAt ||
          null,
      };
    })
    .filter(Boolean);
}

function buildUpdatedPostMedia(photo, replacementUrl) {
  const rawMedia = Array.isArray(photo?.post?.media) ? photo.post.media : [];
  const mappedMedia = Array.isArray(mapApiPostToFeedItem(photo?.post)?.media)
    ? mapApiPostToFeedItem(photo.post).media
    : [];
  const base = rawMedia.length > 0 ? rawMedia : mappedMedia;

  return base
    .map((item, index) => {
      if (index === photo.mediaIndex && !replacementUrl) return null;
      const url =
        index === photo.mediaIndex
          ? replacementUrl
          : item?.url || item?.mediaUrl || item?.imageUrl;
      if (!url) return null;
      const typeRaw = String(item?.type || "").toUpperCase();
      return {
        url,
        type: typeRaw === "VIDEO" ? "VIDEO" : "IMAGE",
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
      };
    })
    .filter(Boolean)
    .map((item, order) => ({ ...item, order }));
}

export default function ProfilePhotosView({
  user,
  onBack,
  refreshMe,
  isOwner = true,
}) {
  const { t } = useTranslation();
  const photoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const postMediaInputRef = useRef(null);
  const postVideoInputRef = useRef(null);
  const viewerTouchStartRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [postMediaFiles, setPostMediaFiles] = useState([]);
  const [postText, setPostText] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoActionLoading, setPhotoActionLoading] = useState(false);
  const [hiddenAvatarUrl, setHiddenAvatarUrl] = useState(null);
  const [uploadVisibility, setUploadVisibility] = useState("PUBLIC");
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [sharePhoto, setSharePhoto] = useState(null);

  const avatarUrl = user?.avatarUrl || user?.avatar || "";
  const visibleAvatarUrl = avatarUrl && avatarUrl !== hiddenAvatarUrl ? avatarUrl : "";
  const displayAvatar = avatarUrl || DEFAULT_AVATAR;
  const ownerVipEnabled = getOwnerVipEnabled(user);
  const authorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    t("common.user");
  const authorId = user?.id || user?._id;

  const selectedPhoto =
    viewerIndex !== null && photos.length > 0
      ? photos[Math.min(Math.max(viewerIndex, 0), photos.length - 1)]
      : null;
  const openMenuPhoto = photos.find((photo) => photo.id === openMenuId) || null;

  const loadPhotos = useCallback(async () => {
    if (!authorId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const avatarPhoto = visibleAvatarUrl
      ? [{
          id: "avatar",
          type: "avatar",
          url: visibleAvatarUrl,
          createdAt:
            user?.avatarUpdatedAt ||
            user?.avatar_updated_at ||
            user?.avatarCreatedAt ||
            user?.avatar_created_at ||
            user?.updatedAt ||
            user?.createdAt ||
            null,
        }]
      : [];

    setLoading(true);
    try {
      const posts = await postsApi.listByAuthor(authorId);
      const postPhotos = (Array.isArray(posts) ? posts : []).flatMap(normalizePostImages);
      const nextPhotos = sortPhotosNewestFirst([...avatarPhoto, ...postPhotos]);
      setPhotos(nextPhotos);
    } catch (err) {
      console.error("[profile photos] failed", err);
      toast.error(getApiErrorMessage(err) || t("profile.photos.loadError", { defaultValue: "Не удалось загрузить фото" }));
      setPhotos(avatarPhoto);
    } finally {
      setLoading(false);
    }
  }, [
    authorId,
    t,
    user?.avatarCreatedAt,
    user?.avatarUpdatedAt,
    user?.avatar_created_at,
    user?.avatar_updated_at,
    user?.createdAt,
    user?.updatedAt,
    visibleAvatarUrl,
  ]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    return () => {
      postMediaFiles.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [postMediaFiles]);

  const closeComposer = () => {
    setIsComposerOpen(false);
    setPostText("");
    setPostMediaFiles((prev) => {
      prev.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  };

  const handlePhotoSelect = (event) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type?.startsWith("image/")
    );
    event.target.value = "";
    if (!files.length) return;

    setPostMediaFiles((prev) => {
      prev.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        type: "image",
        previewUrl: URL.createObjectURL(file),
      }));
    });
    setIsComposerOpen(true);
  };

  const removePostMedia = (id) => {
    setPostMediaFiles((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handlePublishPhotoPost = async () => {
    if (postMediaFiles.length === 0 || isPublishing) return;

    try {
      setIsPublishing(true);
      const media = [];
      for (const [index, item] of postMediaFiles.entries()) {
        const url = await uploadPostImage(item.file);
        media.push({ url, type: "IMAGE", order: index });
      }
      await postsApi.create({
        fullText: postText.trim() || "\u200B",
        media,
        visibility: ownerVipEnabled && uploadVisibility === "VIP" ? "VIP" : "PUBLIC",
      });
      toast.success(t("posts.toast.published"));
      closeComposer();
      setUploadVisibility("PUBLIC");
      await loadPhotos();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t("posts.toast.publishFailed"));
    } finally {
      setIsPublishing(false);
    }
  };

  const openCrop = (photo) => {
    if (!isOwner) return;
    setOpenMenuId(null);
    setViewerIndex(null);
    setCropTarget(photo);
  };

  const fileFromPhotoUrl = async (photo, fileName = "profile-photo.jpg") => {
    const response = await fetch(photo.url);
    if (!response.ok) throw new Error("Photo download failed");
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || "image/jpeg" });
  };

  const handleCropConfirm = async (croppedPixels) => {
    if (!cropTarget || !croppedPixels) return;

    try {
      setIsSavingPhoto(true);
      const file = await cropImageToFile(
        cropTarget.url,
        croppedPixels,
        cropTarget.type === "avatar" ? "avatar.jpg" : "photo.jpg"
      );

      if (cropTarget.type === "avatar") {
        await authApi.uploadAvatar(file);
        setHiddenAvatarUrl(null);
        await refreshMe?.();
      } else {
        const url = await uploadPostImage(file);
        const media = buildUpdatedPostMedia(cropTarget, url);
        await postsApi.update(cropTarget.postId, {
          fullText: cropTarget.post?.fullText ?? cropTarget.post?.shortText ?? "\u200B",
          location: cropTarget.post?.location || undefined,
          media,
        });
      }

      setCropTarget(null);
      setViewerIndex(null);
      toast.success(t("profile.photos.updated", { defaultValue: "Фото обновлено" }));
      await loadPhotos();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t("profile.photos.updateError", { defaultValue: "Не удалось обновить фото" }));
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!isOwner) return;
    setOpenMenuId(null);

    try {
      setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
      if (photo.type === "avatar") {
        setHiddenAvatarUrl(photo.url);
        await authApi.deleteAvatar();
        await refreshMe?.();
      } else {
        const media = buildUpdatedPostMedia(photo, null);
        if (media.length > 0) {
          await postsApi.update(photo.postId, {
            fullText: photo.post?.fullText ?? photo.post?.shortText ?? "\u200B",
            location: photo.post?.location || undefined,
            media,
          });
        } else {
          await postsApi.deletePost(photo.postId);
        }
      }

      toast.success(t("profile.photos.deleted", { defaultValue: "Фото удалено" }));
      setViewerIndex(null);
    } catch (err) {
      await loadPhotos();
      toast.error(getApiErrorMessage(err) || t("profile.photos.deleteError", { defaultValue: "Не удалось удалить фото" }));
    }
  };

  const handleDownloadPhoto = async (photo) => {
    if (!photo?.url) return;
    try {
      setPhotoActionLoading(true);
      await downloadPhoto(
        photo.url,
        photo.type === "avatar" ? "lunmeyo-profile-photo.jpg" : "lunmeyo-photo.jpg",
      );
    } catch (err) {
      console.error("[profile photos] save failed", err);
      toast.error(t("profile.photos.downloadError", { defaultValue: "Не удалось скачать фото" }));
    } finally {
      setPhotoActionLoading(false);
    }
  };

  const openSharePhoto = (photo) => {
    setOpenMenuId(null);
    setSharePhoto(photo);
  };

  const handleSetVisibility = async (photo, visibility) => {
    if (!isOwner || !photo?.postId || photo.type === "avatar") return;
    setOpenMenuId(null);
    try {
      setPhotoActionLoading(true);
      await postsApi.update(photo.postId, { visibility });
      toast.success(
        t("profile.photos.visibilityUpdated", {
          defaultValue: visibility === "VIP" ? "Фото лише для VIP" : "Фото публічне",
        }),
      );
      await loadPhotos();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setPhotoActionLoading(false);
    }
  };

  const handleMakeProfilePhoto = async (photo) => {
    if (!isOwner) return;
    setOpenMenuId(null);
    try {
      setPhotoActionLoading(true);
      const file = await fileFromPhotoUrl(photo, "avatar.jpg");
      await authApi.uploadAvatar(file);
      setHiddenAvatarUrl(null);
      await refreshMe?.();
      toast.success(t("profile.editForm.toast.avatarUpdated", { defaultValue: "Фото профиля обновлено" }));
      setViewerIndex(null);
      await loadPhotos();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t("profile.toast.avatarSaveError", { defaultValue: "Не удалось сохранить фото профиля" }));
    } finally {
      setPhotoActionLoading(false);
    }
  };

  const showPreviousPhoto = () => {
    setViewerIndex((value) => (value == null ? value : Math.max(0, value - 1)));
  };

  const showNextPhoto = () => {
    setViewerIndex((value) => (
      value == null ? value : Math.min(photos.length - 1, value + 1)
    ));
  };

  const handleViewerTouchStart = (event) => {
    const touch = event.touches?.[0];
    viewerTouchStartRef.current = touch
      ? { x: touch.clientX, y: touch.clientY }
      : null;
  };

  useEffect(() => {
    if (!selectedPhoto) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedPhoto]);

  useEffect(() => {
    if (!openMenuId || !window.matchMedia("(max-width: 767px)").matches) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [openMenuId]);

  const handleViewerTouchEnd = (event) => {
    const start = viewerTouchStartRef.current;
    const touch = event.changedTouches?.[0];
    viewerTouchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaY) < 48 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

    if (deltaY < 0) showNextPhoto();
    else showPreviousPhoto();
  };

  const getPhotoActions = (photo) => [
    isOwner && {
      id: "edit",
      label: t("profile.photos.edit", { defaultValue: "Редактировать" }),
      icon: profileIcons.pencilBlack,
      onClick: () => openCrop(photo),
    },
    isOwner && {
      id: "delete",
      label: t("profile.photos.delete", { defaultValue: "Удалить" }),
      icon: profileIcons.storyDelete,
      onClick: () => handleDelete(photo),
    },
    {
      id: "share",
      label: t("profile.photos.share", { defaultValue: "Поделиться" }),
      icon: profileIcons.savedShareBlack,
      onClick: () => openSharePhoto(photo),
    },
    isOwner && {
      id: "profile",
      label: t("profile.photos.makeProfile", { defaultValue: "Сделать фото профиля" }),
      icon: profileIcons.profileBlack,
      onClick: () => handleMakeProfilePhoto(photo),
    },
    isOwner && ownerVipEnabled && photo.type !== "avatar" && {
      id: "visibility",
      label: photo.visibility === "VIP"
        ? t("profile.photos.makePublic", { defaultValue: "Зробити публічним" })
        : t("profile.photos.makeVipOnly", { defaultValue: "Лише для VIP" }),
      icon: profileIcons.lockBlack,
      onClick: () => handleSetVisibility(photo, photo.visibility === "VIP" ? "PUBLIC" : "VIP"),
    },
  ].filter(Boolean);

  const sharePost = sharePhoto?.postId && sharePhoto?.post
    ? mapApiPostToFeedItem(sharePhoto.post)
    : null;

  const handleSendSharedPhoto = async ({ postId, recipientUserIds, message, shareUrl }) => {
    if (postId) {
      return postsApi.send(postId, { recipientUserIds, message });
    }

    if (!shareUrl || !Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
      throw new Error(t("posts.toast.sendFailed"));
    }

    await Promise.all(recipientUserIds.map(async (recipientUserId) => {
      const conversation = await conversationsApi.create(recipientUserId);
      const conversationId = conversation?.id || conversation?._id;
      if (!conversationId) throw new Error(t("posts.toast.sendFailed"));

      await conversationsApi.sendMessage(conversationId, {
        type: "IMAGE",
        text: message || undefined,
        attachments: [{
          url: shareUrl,
          mimeType: "image/jpeg",
          fileName: "profile-photo",
        }],
      });
    }));
  };

  const handleRepostSharedPost = (post) => postsApi.repost(post?.id);

  return (
    <main className="profilePhotos">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="profilePhotos__hiddenInput"
        onChange={handlePhotoSelect}
      />

      <div className="profilePhotos__head">
        <button
          type="button"
          className="profilePhotos__back"
          onClick={onBack}
          aria-label={t("common.back")}
        >
          <img src={profileIcons.arrowLeftBlack} alt="" />
        </button>
        <h1 className="profilePhotos__title">
          {isOwner
            ? t("profile.photos.title", { defaultValue: "Мои фото" })
            : t("profile.photos.userTitle", {
                name: authorName,
                defaultValue: `Фото ${authorName}`,
              })}
        </h1>
      </div>

      <section
        className={`profilePhotos__grid${photos.length === 0 ? " profilePhotos__grid--empty" : ""}${showAllMobile ? " is-expanded" : ""}`}
        aria-label={t("profile.photos.title", { defaultValue: "Мои фото" })}
        aria-busy={loading}
      >
        {photos.length > 0 ? (
          photos.map((photo, index) => (
            <article key={photo.id} className="profilePhotos__card">
              <button
                type="button"
                className="profilePhotos__imageBtn"
                onClick={() => setViewerIndex(index)}
                aria-label={t("profile.viewPhotoFull")}
              >
                <img src={photo.url} alt="" className="profilePhotos__image" loading="lazy" />
                {ownerVipEnabled && photo.type !== "avatar" && photo.visibility === "VIP" ? (
                  <span className="profilePhotos__vipBadge">VIP</span>
                ) : null}
              </button>
              <button
                type="button"
                className="profilePhotos__menuBtn"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuId((current) => (current === photo.id ? null : photo.id));
                }}
                aria-label={t("profile.more")}
                aria-expanded={openMenuId === photo.id}
              >
                <span aria-hidden="true">•••</span>
              </button>

              {openMenuId === photo.id ? (
                <div className="profilePhotos__menu profilePhotos__menu--desktop" role="menu">
                  {getPhotoActions(photo).map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      onClick={action.onClick}
                      disabled={photoActionLoading}
                    >
                      <img src={action.icon} alt="" aria-hidden="true" />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : loading ? (
          <p className="profilePhotos__empty profilePhotos__empty--loading">
            {t("common.loading")}
          </p>
        ) : (
          <p className="profilePhotos__empty">
            {t("profile.photos.empty", { defaultValue: "Пока нет фото" })}
          </p>
        )}
      </section>

      {photos.length > 6 ? (
        <button
          type="button"
          className="profilePhotos__showAll"
          onClick={() => setShowAllMobile((current) => !current)}
        >
          {showAllMobile
            ? t("profile.photos.showLess", { defaultValue: "Показать меньше" })
            : t("profile.photos.showAll", { defaultValue: "Показать все" })}
        </button>
      ) : null}

      {openMenuPhoto ? createPortal(
        <div
          className="profilePhotosActionSheet"
          role="presentation"
          onClick={() => setOpenMenuId(null)}
        >
          <section
            className="profilePhotosActionSheet__panel"
            role="menu"
            aria-label={t("profile.more")}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="profilePhotosActionSheet__handle" aria-hidden="true" />
            {getPhotoActions(openMenuPhoto).map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                onClick={action.onClick}
                disabled={photoActionLoading}
              >
                <img src={action.icon} alt="" aria-hidden="true" />
                <span>{action.label}</span>
              </button>
            ))}
          </section>
        </div>,
        document.body,
      ) : null}

      {cropTarget ? (
        <AvatarCropModal
          src={cropTarget.url}
          onClose={() => !isSavingPhoto && setCropTarget(null)}
          onConfirm={handleCropConfirm}
          aspect={cropTarget.type === "avatar" ? 1 : undefined}
          cropShape={cropTarget.type === "avatar" ? "round" : "rect"}
          showGrid={cropTarget.type !== "avatar"}
        />
      ) : null}

      {isComposerOpen ? (
        <CreatePostModal
          authorName={authorName}
          displayAvatar={displayAvatar}
          showOnlineDot={user?.isOnline === true || user?.online === true}
          text={postText}
          onTextChange={setPostText}
          textareaRef={textareaRef}
          postMediaFiles={postMediaFiles}
          onRemoveMedia={removePostMedia}
          postMediaInputRef={postMediaInputRef}
          postVideoInputRef={postVideoInputRef}
          onPhotoSelect={handlePhotoSelect}
          onVideoSelect={() => {}}
          isPublishing={isPublishing}
          onPublish={handlePublishPhotoPost}
          onClose={closeComposer}
          canPublish={postMediaFiles.length > 0}
          showVisibilityPicker={ownerVipEnabled}
          visibility={uploadVisibility}
          onVisibilityChange={setUploadVisibility}
        />
      ) : null}

      {selectedPhoto ? createPortal(
        <div
          className={`profilePhotosViewer${isOwner ? "" : " profilePhotosViewer--visitor"}`}
          role="dialog"
          aria-modal="true"
          aria-label={t("profile.viewPhotoFull")}
          onClick={() => setViewerIndex(null)}
        >
          <div className="profilePhotosViewer__panel" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="profilePhotosViewer__close"
              onClick={() => setViewerIndex(null)}
              aria-label={t("common.close")}
            >
              <img src={profileIcons.close} alt="" />
            </button>

            {photos.length > 1 ? (
              <button
                type="button"
                className="profilePhotosViewer__nav profilePhotosViewer__nav--prev"
                onClick={showPreviousPhoto}
                disabled={viewerIndex <= 0}
                aria-label={t("posts.lightbox.prev")}
              >
                <img src={profileIcons.arrowRightFilledBlack} alt="" aria-hidden="true" />
              </button>
            ) : null}

            <div
              className="profilePhotosViewer__media"
              onTouchStart={handleViewerTouchStart}
              onTouchEnd={handleViewerTouchEnd}
            >
              <img
                src={selectedPhoto.url}
                alt=""
                className="profilePhotosViewer__image"
                draggable={false}
              />
            </div>

            {photos.length > 1 ? (
              <button
                type="button"
                className="profilePhotosViewer__nav profilePhotosViewer__nav--next"
                onClick={showNextPhoto}
                disabled={viewerIndex >= photos.length - 1}
              aria-label={t("posts.lightbox.next")}
            >
                <img src={profileIcons.arrowRightFilledBlack} alt="" aria-hidden="true" />
              </button>
            ) : null}

            <div className="profilePhotosViewer__actions">
              {isOwner ? (
              <button type="button" onClick={() => openCrop(selectedPhoto)} disabled={photoActionLoading}>
                <img src={profileIcons.pencilBlack} alt="" className="profilePhotosViewer__actionIcon" aria-hidden="true" />
                <span>{t("profile.photos.edit", { defaultValue: "Редактировать" })}</span>
              </button>
              ) : null}
              {isOwner ? (
              <button type="button" onClick={() => handleDelete(selectedPhoto)} disabled={photoActionLoading}>
                <img src={profileIcons.storyDelete} alt="" className="profilePhotosViewer__actionIcon" aria-hidden="true" />
                <span>{t("profile.photos.delete", { defaultValue: "Удалить" })}</span>
              </button>
              ) : null}
              <button type="button" onClick={() => openSharePhoto(selectedPhoto)} disabled={photoActionLoading}>
                <img src={profileIcons.savedShareBlack} alt="" className="profilePhotosViewer__actionIcon" aria-hidden="true" />
                <span>{t("profile.photos.share", { defaultValue: "Поделиться" })}</span>
              </button>
              {isOwner ? (
              <button type="button" onClick={() => handleMakeProfilePhoto(selectedPhoto)} disabled={photoActionLoading}>
                <img src={profileIcons.profileBlack} alt="" className="profilePhotosViewer__actionIcon" aria-hidden="true" />
                <span>{t("profile.photos.makeProfile", { defaultValue: "Сделать фото профиля" })}</span>
              </button>
              ) : null}
              {isOwner && ownerVipEnabled && selectedPhoto.type !== "avatar" ? (
                <button
                  type="button"
                  className="profilePhotosViewer__visibilityAction"
                  onClick={() =>
                    handleSetVisibility(
                      selectedPhoto,
                      selectedPhoto.visibility === "VIP" ? "PUBLIC" : "VIP",
                    )
                  }
                  disabled={photoActionLoading}
                >
                  <img src={profileIcons.lockBlack} alt="" className="profilePhotosViewer__actionIcon" aria-hidden="true" />
                  {selectedPhoto.visibility === "VIP"
                    ? t("profile.photos.makePublic", { defaultValue: "Зробити публічним" })
                    : t("profile.photos.makeVipOnly", { defaultValue: "Лише для VIP" })}
                </button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <SharePostModal
        post={sharePost}
        isOpen={Boolean(sharePhoto)}
        onClose={() => setSharePhoto(null)}
        onSendToUsers={handleSendSharedPhoto}
        onRepostToFeed={sharePost ? handleRepostSharedPost : undefined}
        isReposted={sharePost?.viewerState?.isReposted === true}
        shareUrl={sharePost ? undefined : sharePhoto?.url}
        shareText={t("profile.photos.shareText", {
          name: authorName,
          defaultValue: `Фото ${authorName}`,
        })}
        onDownload={() => handleDownloadPhoto(sharePhoto)}
        downloadLabel={t("profile.photos.download", { defaultValue: "Сохранить на устройство" })}
      />
    </main>
  );
}
