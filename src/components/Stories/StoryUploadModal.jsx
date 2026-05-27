import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { storiesApi } from "../../services/storiesApi";
import { uploadStoryMedia } from "../../services/storyMediaUploadApi";
import "./StoryUploadModal.scss";

export default function StoryUploadModal({ isOpen, onClose, onCreated }) {
  const inputRef = useRef(null);
  const [fileItem, setFileItem] = useState(null);
  const [text, setText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (fileItem?.previewUrl) {
        URL.revokeObjectURL(fileItem.previewUrl);
      }
    };
  }, [fileItem]);

  if (!isOpen) return null;

  const reset = () => {
    if (fileItem?.previewUrl) {
      URL.revokeObjectURL(fileItem.previewUrl);
    }

    setFileItem(null);
    setText("");
    setIsPublishing(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    const isImage = file.type?.startsWith("image/");
    const isVideo = file.type?.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Можна завантажити тільки фото або відео");
      return;
    }

    if (fileItem?.previewUrl) {
      URL.revokeObjectURL(fileItem.previewUrl);
    }

    setFileItem({
      file,
      type: isVideo ? "video" : "image",
      previewUrl: URL.createObjectURL(file),
    });
  };

  const handlePublish = async () => {
    if (!fileItem?.file) {
      toast.error("Спочатку виберіть фото або відео");
      return;
    }

    try {
      setIsPublishing(true);

      const uploaded = await uploadStoryMedia(fileItem.file);

      const created = await storiesApi.create({
        mediaUrl: uploaded.mediaUrl,
        mediaType: uploaded.mediaType,
        text: text.trim(),
      });

      toast.success("Story опубліковано");
      onCreated?.(created);
      handleClose();
    } catch (e) {
      console.error("[story-upload] failed", e);
      toast.error(e?.message || "Не вдалося опублікувати story");
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="storyUploadModal"
      role="dialog"
      aria-modal="true"
      aria-label="Додати story"
      onClick={handleClose}
    >
      <div className="storyUploadModal__card" onClick={(e) => e.stopPropagation()}>
        <div className="storyUploadModal__header">
          <h3 className="storyUploadModal__title">Додати story</h3>

          <button
            type="button"
            className="storyUploadModal__close"
            onClick={handleClose}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="storyUploadModal__file"
          onChange={handleSelectFile}
        />

        {!fileItem ? (
          <button
            type="button"
            className="storyUploadModal__pick"
            onClick={() => inputRef.current?.click()}
          >
            Вибрати фото або відео
          </button>
        ) : (
          <div className="storyUploadModal__previewWrap">
            {fileItem.type === "video" ? (
              <video
                src={fileItem.previewUrl}
                className="storyUploadModal__preview"
                controls
              />
            ) : (
              <img
                src={fileItem.previewUrl}
                alt=""
                className="storyUploadModal__preview"
              />
            )}

            <button
              type="button"
              className="storyUploadModal__replace"
              onClick={() => inputRef.current?.click()}
              disabled={isPublishing}
            >
              Замінити файл
            </button>
          </div>
        )}

        <textarea
          className="storyUploadModal__text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст до story (необов'язково)"
          rows={3}
          disabled={isPublishing}
        />

        <button
          type="button"
          className="storyUploadModal__publish"
          onClick={handlePublish}
          disabled={isPublishing || !fileItem}
        >
          {isPublishing ? "Публікуємо..." : "Опублікувати story"}
        </button>
      </div>
    </div>
  );
}