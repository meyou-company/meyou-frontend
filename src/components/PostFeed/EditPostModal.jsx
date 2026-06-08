import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import EmojiPickerButton from "../EmojiPicker/EmojiPickerButton";
import profileIcons from "../../constants/profileIcons";
import {
  isPostImageUploadEnabled,
  uploadPostImage,
} from "../../services/postImageUploadApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import "./EditPostModal.scss";

function mediaItemId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function EditPostModal({
  post,
  isOpen,
  onClose,
  onSave,
  saving = false,
  displayAvatar,
}) {
  const { t } = useTranslation();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [existingMedia, setExistingMedia] = useState([]);
  const [newMediaFiles, setNewMediaFiles] = useState([]);

  useEffect(() => {
    if (!isOpen || !post) return;
    setText(post.text ?? "");
    setLocation(post.location ?? "");
    setExistingMedia(
      Array.isArray(post.media)
        ? post.media.map((m, idx) => ({
            id: `existing-${idx}`,
            url: m.url,
            type: m.type === "VIDEO" ? "VIDEO" : "IMAGE",
            order: m.order ?? idx,
          }))
        : []
    );
    setNewMediaFiles([]);
  }, [isOpen, post]);

  useEffect(() => {
    return () => {
      newMediaFiles.forEach((f) => {
        if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [newMediaFiles]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !post) return null;

  const onPickMedia = (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const next = files.map((file) => ({
      id: mediaItemId(),
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type?.startsWith("video") ? "video" : "image",
    }));
    setNewMediaFiles((prev) => [...prev, ...next]);
  };

  const removeExisting = (id) => {
    setExistingMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const removeNew = (id) => {
    setNewMediaFiles((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleSave = async () => {
    const trimmed = (text ?? "").trim();
    const hasMedia = existingMedia.length > 0 || newMediaFiles.length > 0;
    if (!trimmed && !hasMedia) {
      toast.error(t('posts.validation.emptyContent'));
      return;
    }

    const media = [...existingMedia]
      .sort((a, b) => a.order - b.order)
      .map((m, idx) => ({
        url: m.url,
        type: m.type,
        order: idx,
      }));

    if (newMediaFiles.length > 0) {
      if (!isPostImageUploadEnabled()) {
        toast.info(t('posts.toast.editMediaUploadDisabled'));
      } else {
        for (const [index, item] of newMediaFiles.entries()) {
          if (!item?.file) continue;
          try {
            const url = await uploadPostImage(item.file);
            media.push({
              url,
              type: item.file.type?.startsWith("video") ? "VIDEO" : "IMAGE",
              order: media.length + index,
            });
          } catch (err) {
            toast.warning(
              getApiErrorMessage(err) || t('posts.toast.editMediaUploadFileFailed')
            );
          }
        }
      }
    }

    await onSave?.({
      text: trimmed || "\u200B",
      location: (location ?? "").trim(),
      media,
    });
  };

  return (
    <div
      className="editPostModalOverlay"
      role="presentation"
      onClick={() => !saving && onClose?.()}
    >
      <div
        className="editPostModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="editPostModal__header">
          <h2 id="edit-post-title" className="editPostModal__title">
            {t('posts.edit.title')}
          </h2>
          <button
            type="button"
            className="editPostModal__close"
            aria-label={t('posts.edit.close')}
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="editPostModal__inputShell">
          {displayAvatar ? (
            <img src={displayAvatar} alt="" className="editPostModal__avatar" />
          ) : null}
          <textarea
            ref={textareaRef}
            className="editPostModal__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('posts.edit.textPlaceholder')}
            rows={4}
          />
          <EmojiPickerButton
            inputRef={textareaRef}
            value={text}
            onChange={setText}
            className="editPostModal__emojiBtn"
            ariaLabel={t('posts.edit.addEmoji')}
          />
        </div>

        <label className="editPostModal__locationLabel">
          {t('posts.edit.locationLabel')}
          <input
            type="text"
            className="editPostModal__locationInput"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('posts.edit.locationPlaceholder')}
          />
        </label>

        {(existingMedia.length > 0 || newMediaFiles.length > 0) && (
          <div className="editPostModal__mediaGrid">
            {existingMedia.map((m) => (
              <div key={m.id} className="editPostModal__mediaItem">
                {m.type === "VIDEO" ? (
                  <video src={m.url} className="editPostModal__mediaPreview" controls />
                ) : (
                  <img src={m.url} alt="" className="editPostModal__mediaPreview" />
                )}
                <button
                  type="button"
                  className="editPostModal__mediaRemove"
                  aria-label={t('posts.edit.removeMedia')}
                  onClick={() => removeExisting(m.id)}
                >
                  ×
                </button>
              </div>
            ))}
            {newMediaFiles.map((m) => (
              <div key={m.id} className="editPostModal__mediaItem">
                {m.type === "video" ? (
                  <video src={m.previewUrl} className="editPostModal__mediaPreview" controls />
                ) : (
                  <img src={m.previewUrl} alt="" className="editPostModal__mediaPreview" />
                )}
                <button
                  type="button"
                  className="editPostModal__mediaRemove"
                  aria-label={t('posts.edit.removeFile')}
                  onClick={() => removeNew(m.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="editPostModal__fileInput"
          onChange={onPickMedia}
        />

        <div className="editPostModal__footer">
          <button
            type="button"
            className="editPostModal__addMediaBtn"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
          >
            <img src={profileIcons.live} alt="" aria-hidden="true" />
            {t('posts.edit.addMedia')}
          </button>
          <button
            type="button"
            className="editPostModal__saveBtn"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? t('posts.edit.saving') : t('posts.edit.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
