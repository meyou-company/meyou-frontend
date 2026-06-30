import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import AvatarCropModal from "../../../AvatarCropModal/AvatarCropModal";
import CreatePostModal from "../../../PostFeed/CreatePostModal";
import ImageLightbox from "../../../PostFeed/ImageLightbox";
import { authApi } from "../../../../services/auth";
import { postsApi } from "../../../../services/postsApi";
import { uploadPostImage } from "../../../../services/postImageUploadApi";
import { cropImageToFile } from "../../../../utils/cropImageToFile";
import { getApiErrorMessage } from "../../../../utils/getApiErrorMessage";
import { mapApiPostToFeedItem } from "../../../../utils/mapApiPostToFeedItem";
import "./ProfilePhotosView.scss";

const DEFAULT_AVATAR = "/Logo/photo.png";

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
        createdAt: mapped?.createdAt || post?.createdAt || null,
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
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [postMediaFiles, setPostMediaFiles] = useState([]);
  const [postText, setPostText] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const avatarUrl = user?.avatarUrl || user?.avatar || "";
  const displayAvatar = avatarUrl || DEFAULT_AVATAR;
  const authorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    t("common.user");
  const authorId = user?.id || user?._id;

  const lightboxImages = useMemo(() => photos.map((photo) => photo.url), [photos]);

  const loadPhotos = async () => {
    if (!authorId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const avatarPhoto = avatarUrl
      ? [{
          id: "avatar",
          type: "avatar",
          url: avatarUrl,
        }]
      : [];

    setPhotos(avatarPhoto);
    setLoading(true);
    try {
      const posts = await postsApi.listByAuthor(authorId);
      const postPhotos = (Array.isArray(posts) ? posts : []).flatMap(normalizePostImages);
      const nextPhotos = [...avatarPhoto, ...postPhotos];
      setPhotos(nextPhotos);
    } catch (err) {
      console.error("[profile photos] failed", err);
      toast.error(getApiErrorMessage(err) || t("profile.photos.loadError", { defaultValue: "Не удалось загрузить фото" }));
      setPhotos(avatarUrl ? [{ id: "avatar", type: "avatar", url: avatarUrl }] : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [authorId, avatarUrl]);

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
    setCropTarget(photo);
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
      if (photo.type === "avatar") {
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
      await loadPhotos();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t("profile.photos.deleteError", { defaultValue: "Не удалось удалить фото" }));
    }
  };

  const handleShare = async (photo) => {
    setOpenMenuId(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("profile.photos.shareTitle", { defaultValue: "Фото ME YOU" }),
          url: photo.url,
        });
        return;
      }
      await navigator.clipboard?.writeText(photo.url);
      toast.success(t("profile.photos.linkCopied", { defaultValue: "Ссылка скопирована" }));
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(t("profile.photos.shareError", { defaultValue: "Не удалось отправить фото" }));
      }
    }
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
          ←
        </button>
        <h1 className="profilePhotos__title">
          {t("profile.photos.title", { defaultValue: "Мои фото" })}
        </h1>
        <button type="button" className="profilePhotos__addBtn" onClick={openAddPhoto}>
          <span aria-hidden="true">+</span>
          {t("profile.photos.add", { defaultValue: "Добавить фото" })}
        </button>
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
                onClick={() => setLightboxIndex(index)}
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
                  <button type="button" role="menuitem" onClick={() => handleShare(photo)}>
                    {t("profile.photos.send", { defaultValue: "Отправить" })}
                  </button>
                </div>
              ) : null}
            </article>
          ))
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

      {lightboxIndex !== null ? (
        <ImageLightbox
          isOpen={lightboxIndex !== null}
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((value) => Math.max(0, value - 1))}
          onNext={() => setLightboxIndex((value) => Math.min(lightboxImages.length - 1, value + 1))}
        />
      ) : null}
    </main>
  );
}
