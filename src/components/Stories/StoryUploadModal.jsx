import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { storiesApi } from "../../services/storiesApi";
import { uploadStoryMedia } from "../../services/storyMediaUploadApi";
import AppHeader from "../Layout/AppHeader";
import profileIcons from "../../constants/profileIcons";
import "./StoryUploadModal.scss";

export default function StoryUploadModal({ isOpen, onClose, onCreated }) {
  const inputRef = useRef(null);
  const [fileItem, setFileItem] = useState(null);
  const [text, setText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
  if (!isOpen) return undefined;

  const previousBodyOverflow = document.body.style.overflow;
  const previousHtmlOverflow = document.documentElement.style.overflow;

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const onEscape = (e) => {
    if (e.key === "Escape") onClose?.();
  };

  window.addEventListener("keydown", onEscape);

  return () => {
    window.removeEventListener("keydown", onEscape);
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
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
    <div className="storyUploadModal" role="dialog" aria-modal="true" aria-label="Додати story">
      <AppHeader
        onGoProfile={() => navigate("/profile")}
        onGoExplore={() => navigate("/search")}
        onGoWallet={() => navigate("/wallet")}
        onGoVipChat={() => navigate("/vip-chat")}
        onGoHome={() => navigate("/first-page")}
      />

      <div className="storyUploadModal__page">
        <div className="storyUploadModal__bgDots" aria-hidden="true" />

        <div className="storyUploadModal__content">
          <div className="storyUploadModal__head">
            <button
              type="button"
              className="storyUploadModal__close"
              onClick={handleClose}
              aria-label="Закрити"
            >
              <img src={profileIcons.close} className="storyUploadModal_closeIcon" alt="" />
            </button>

            <h3 className="storyUploadModal__title">Дополнить историю</h3>

            <button type="button" className="storyUploadModal__settings" aria-label="Настройки">
              <img src={profileIcons.storySettings} alt="" />
            </button>
          </div>

          <div className="storyUploadModal__tools" aria-label="Story tools">
            <button type="button" className="storyUploadModal__tool">
              <span className="storyUploadModal__toolIcon">Aa</span>
              <span>Текст</span>
            </button>

            <button type="button" className="storyUploadModal__tool">
              <span className="storyUploadModal__toolIcon">
                <img src={profileIcons.storyMusic} alt="" />
              </span>
              <span>Музыка</span>
            </button>

            <button type="button" className="storyUploadModal__tool">
              <img src={profileIcons.storyTemplate} alt="" />
              <span>Шаблоны</span>
            </button>

            <button type="button" className="storyUploadModal__tool">
              <img src={profileIcons.storyCollage} alt="" />
              <span>Коллаж</span>
            </button>
          </div>

          <div className="storyUploadModal__galleryHead">
            <button type="button" className="storyUploadModal__galleryTitle">
              Галерея
              <img src={profileIcons.arrowLeftFilledBlack} className="storyUploadModal__galleryArrowIcon" alt="" />
            </button>

            <button
              type="button"
              className="storyUploadModal__selectBtn"
              onClick={() => inputRef.current?.click()}
              disabled={isPublishing}
            >
              Выбрать
              <span className="storyUploadModal__selectIcon">
                <img src={profileIcons.storyGallery} alt="" />
              </span>
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="storyUploadModal__file"
            onChange={handleSelectFile}
          />

          {fileItem ? (
            <div className="storyUploadModal__selectedPanel">
              <div className="storyUploadModal__previewShell">
                {fileItem.type === "video" ? (
                  <video src={fileItem.previewUrl} className="storyUploadModal__preview" controls />
                ) : (
                  <img src={fileItem.previewUrl} alt="" className="storyUploadModal__preview" />
                )}
              </div>

              <textarea
                className="storyUploadModal__text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Текст до story (необов'язково)"
                rows={2}
                disabled={isPublishing}
              />

              <div className="storyUploadModal__publishRow">
                <button
                  type="button"
                  className="storyUploadModal__replace"
                  onClick={() => inputRef.current?.click()}
                  disabled={isPublishing}
                >
                  Заменить
                </button>

                <button
                  type="button"
                  className="storyUploadModal__publish"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? "Публикуем..." : "Опубликовать"}
                </button>
              </div>
            </div>
          ) : (
            <div className="storyUploadModal__grid" onClick={() => inputRef.current?.click()}>
              {Array.from({ length: 12 }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  className="storyUploadModal__tile"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  aria-label="Вибрати файл"
                >
                  {index === 0 && (
                    <span className="storyUploadModal__camera">
                      <img src={profileIcons.storyCamera} alt="" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
