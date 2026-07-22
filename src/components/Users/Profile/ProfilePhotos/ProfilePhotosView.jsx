import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import CreatePostModal from "../../../PostFeed/CreatePostModal";
import { authApi } from "../../../../services/auth";
import { postsApi } from "../../../../services/postsApi";
import { uploadPostImage } from "../../../../services/postImageUploadApi";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { getApiErrorMessage } from "../../../../utils/getApiErrorMessage";
import { mapApiPostToFeedItem } from "../../../../utils/mapApiPostToFeedItem";
import profileIcons from '../../../../constants/profileIcons';
import "./ProfilePhotosView.scss";

const DEFAULT_AVATAR = "/Logo/photo.png";

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
}) {
  const { t } = useTranslation();
  const photoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const postMediaInputRef = useRef(null);
  const postVideoInputRef = useRef(null);

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

  const avatarUrl = user?.avatarUrl || user?.avatar || "";
  const visibleAvatarUrl = avatarUrl && avatarUrl !== hiddenAvatarUrl ? avatarUrl : "";
  const displayAvatar = avatarUrl || DEFAULT_AVATAR;
  const authorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    t("common.user");
  const authorId = user?.id || user?._id;

  const selectedPhoto =
    viewerIndex !== null && photos.length > 0
      ? photos[Math.min(Math.max(viewerIndex, 0), photos.length - 1)]
      : null;

  const loadPhotos = async () => {
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
  };

  useEffect(() => {
    loadPhotos();
  }, [authorId, visibleAvatarUrl, user?.updatedAt]);

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
        visibility: "PUBLIC",
      });
      toast.success(t("posts.toast.published"));
      closeComposer();
      await loadPhotos();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t("posts.toast.publishFailed"));
    } finally {
      setIsPublishing(false);
    }
  };

  const openAddPhoto = () => {
    photoInputRef.current?.click();
  };

  const openCrop = (photo) => {
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

  const handleSavePhoto = async (photo) => {
    setOpenMenuId(null);
    try {
      setPhotoActionLoading(true);
      const response = await fetch(photo.url);
      if (!response.ok) throw new Error("Photo download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = photo.type === "avatar" ? "meyou-profile-photo.jpg" : "meyou-photo.jpg";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("[profile photos] save failed", err);
      window.open(photo.url, "_blank", "noopener,noreferrer");
    } finally {
      setPhotoActionLoading(false);
    }
  };

  const handleMakeProfilePhoto = async (photo) => {
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
          {t("profile.photos.title", { defaultValue: "Мои фото" })}
        </h1>
      </div>

      <section
        className={`profilePhotos__grid${photos.length === 0 ? " profilePhotos__grid--empty" : ""}`}
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
                <div className="profilePhotos__menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => openCrop(photo)}>
                    {t("profile.photos.edit", { defaultValue: "Редактировать" })}
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleDelete(photo)}>
                    {t("profile.photos.delete", { defaultValue: "Удалить" })}
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleSavePhoto(photo)}>
                    {t("profile.photos.save", { defaultValue: "Сохранить" })}
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMakeProfilePhoto(photo)}>
                    {t("profile.photos.makeProfile", { defaultValue: "Сделать фото профиля" })}
                  </button>
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
          showOnlineDot={user?.online !== false}
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
        />
      ) : null}

      {selectedPhoto ? (
        <div
          className="profilePhotosViewer"
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

            <img src={selectedPhoto.url} alt="" className="profilePhotosViewer__image" />

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
              <button type="button" onClick={() => openCrop(selectedPhoto)} disabled={photoActionLoading}>
                {t("profile.photos.edit", { defaultValue: "Редактировать" })}
              </button>
              <button type="button" onClick={() => handleDelete(selectedPhoto)} disabled={photoActionLoading}>
                {t("profile.photos.delete", { defaultValue: "Удалить" })}
              </button>
              <button type="button" onClick={() => handleSavePhoto(selectedPhoto)} disabled={photoActionLoading}>
                {t("profile.photos.save", { defaultValue: "Сохранить" })}
              </button>
              <button type="button" onClick={() => handleMakeProfilePhoto(selectedPhoto)} disabled={photoActionLoading}>
                {t("profile.photos.makeProfile", { defaultValue: "Сделать фото профиля" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
