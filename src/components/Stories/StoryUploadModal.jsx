import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../zustand/useAuthStore";
import { storiesApi } from "../../services/storiesApi";
import { uploadStoryMedia } from "../../services/storyMediaUploadApi";
import AppHeader from "../Layout/AppHeader";
import profileIcons from "../../constants/profileIcons";
import "./StoryUploadModal.scss";

const STORY_VISIBILITY_OPTIONS = [
  { value: "FOLLOWERS", label: "Подписчики" },
  { value: "FRIENDS", label: "Друзья" },
  // { value: "CLOSE_FRIENDS", label: "Близкие друзья" },
  { value: "PUBLIC", label: "Все" },
  { value: "ONLY_ME", label: "Только я" },
];

export default function StoryUploadModal({ isOpen, onClose, onCreated }) {
  const inputRef = useRef(null);
  const [fileItem, setFileItem] = useState(null);
  const [text, setText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [visibility, setVisibility] = useState("FOLLOWERS");
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserAvatar =
    currentUser?.avatarUrl ||
    currentUser?.avatar ||
    currentUser?.photoUrl ||
    profileIcons.userStory;

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
    if (!isOpen) return;

    const handleCloseStoryOverlays = () => {
      onClose?.();
    };

    window.addEventListener(
      "closeStoryOverlays",
      handleCloseStoryOverlays
    );

    return () => {
      window.removeEventListener(
        "closeStoryOverlays",
        handleCloseStoryOverlays
      );
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

  const handleBackToPicker = () => {
    if (fileItem?.previewUrl) {
      URL.revokeObjectURL(fileItem.previewUrl);
    }

    setFileItem(null);
    setText("");
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

    const previewUrl = URL.createObjectURL(file);

    if (isImage) {
      const img = new Image();

      img.onload = () => {
        const orientation =
          img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait";

        setFileItem({
          file,
          type: "image",
          previewUrl,
          orientation,
        });
      };

      img.onerror = () => {
        setFileItem({
          file,
          type: "image",
          previewUrl,
          orientation: "unknown",
        });
      };

      img.src = previewUrl;
      return;
    }

    setFileItem({
      file,
      type: "video",
      previewUrl,
      orientation: "unknown",
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
        visibility,
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
    >
      <AppHeader
        onGoProfile={() => navigate("/profile")}
        onGoExplore={() => navigate("/search")}
        onGoWallet={() => navigate("/wallet")}
        onGoVipChat={() => navigate("/vip-chat")}
        onGoHome={() => navigate("/first-page")}
      />

      <div className="storyUploadModal__page">
        <div className="storyUploadModal__bgDots" aria-hidden="true" />

        <div
          className={`storyUploadModal__content ${fileItem ? "storyUploadModal__content--editor" : ""
            }`}
        >
          {!fileItem && (
            <>
              <div className="storyUploadModal__head">
                <button
                  type="button"
                  className="storyUploadModal__close"
                  onClick={handleClose}
                  aria-label="Закрити"
                >
                  <img
                    src={profileIcons.close}
                    className="storyUploadModal_closeIcon"
                    alt=""
                  />
                </button>

                <h3 className="storyUploadModal__title">Дополнить историю</h3>

                <button
                  type="button"
                  className="storyUploadModal__settings"
                  aria-label="Настройки"
                >
                  <img
                    src={profileIcons.storySettings}
                    alt=""
                    className="storyUploadModal_settingsIcon"
                  />
                </button>
              </div>

              <div className="storyUploadModal__tools" aria-label="Story tools">
                <button type="button" className="storyUploadModal__tool">
                  <span className="storyUploadModal__toolIcon storyUploadModal__toolIcon--text">
                    Aa
                  </span>
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
                  <img
                    src={profileIcons.arrowLeftFilledBlack}
                    className="storyUploadModal__galleryArrowIcon"
                    alt=""
                  />
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
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="storyUploadModal__file"
            onChange={handleSelectFile}
          />

          {fileItem ? (
            <div className="storyUploadModal__editor">
              <div className="storyUploadModal__editorCard">
                <div className="storyUploadModal__editorTop">
                  <button
                    type="button"
                    className="storyUploadModal__editorBack"
                    onClick={handleBackToPicker}
                    aria-label="Назад"
                  >
                    <img src={profileIcons.storyBack} alt="" />
                  </button>

                  <div className="storyUploadModal__editorTools">
                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                    >
                      <span className="storyUploadModal__editorToolIcon storyUploadModal__editorToolIcon--text">
                        Aa
                      </span>
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                    >
                      <img src={profileIcons.storySticker} alt="" />
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                    >
                      <img src={profileIcons.storyEditorMusic} alt="" />
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                    >
                      <img src={profileIcons.storyBrush} alt="" />
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool storyUploadModal__editorTool--small"
                    >
                      <img src={profileIcons.storyArrowFilled} alt="" />
                    </button>
                  </div>
                </div>

                <div
                  className={`storyUploadModal__mediaFrame ${fileItem.orientation === "landscape"
                    ? "storyUploadModal__mediaFrame--landscape"
                    : fileItem.orientation === "portrait"
                      ? "storyUploadModal__mediaFrame--portrait"
                      : "storyUploadModal__mediaFrame--unknown"
                    }`}
                >
                  {fileItem.type === "video" ? (
                    <video
                      src={fileItem.previewUrl}
                      className="storyUploadModal__editorMedia"
                      controls
                    />
                  ) : (
                    <img
                      src={fileItem.previewUrl}
                      alt=""
                      className="storyUploadModal__editorMedia"
                    />
                  )}
                </div>

                <textarea
                  className="storyUploadModal__caption"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Добавьте подпись..."
                  rows={1}
                  disabled={isPublishing}
                />
              </div>

              <div className="storyUploadModal__bottomActions">
                <button type="button" className="storyUploadModal__audienceBtn" onClick={handlePublish}
                  disabled={isPublishing}>
                  <span className="storyUploadModal__audienceAvatar">
                    <img src={currentUserAvatar} alt="" />
                  </span>
                  <span>Ваша история</span>
                </button>

                <div className="storyUploadModal__visibilityWrap">
                  <button
                    type="button"
                    className="storyUploadModal__audienceBtn"
                    onClick={() => setIsVisibilityOpen((prev) => !prev)}
                    disabled={isPublishing}
                  >
                    <span className="storyUploadModal__closeFriendsIcon">
                      <img src={profileIcons.storyVisibility || profileIcons.storyCloseFriends} alt="" />
                    </span>
                    <span>Видимость</span>
                  </button>

                  {isVisibilityOpen && (
                    <div className="storyUploadModal__visibilityMenu">
                      <p className="storyUploadModal__visibilityTitle">
                        👁️ Кто может видеть эту сторис:
                      </p>

                      {STORY_VISIBILITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="storyUploadModal__visibilityOption"
                          onClick={() => {
                            setVisibility(option.value);
                            setIsVisibilityOpen(false);
                          }}
                        >
                          <span className="storyUploadModal__visibilityRadio">
                            {visibility === option.value ? "✓" : ""}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="storyUploadModal__nextBtn"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  aria-label="Опубликовать"
                >
                  {isPublishing ? "..." : <img
                    src={profileIcons.storyArrowFilled}
                    alt=""
                    className="storyUploadModal__nextIcon"
                  />}
                </button>
              </div>
            </div>
          ) : (
            <div className="storyUploadModal__pickOnly">
              <button
                type="button"
                className="storyUploadModal__pickFileBtn"
                onClick={() => inputRef.current?.click()}
                disabled={isPublishing}
              >
                <span className="storyUploadModal__pickFileIcon">
                  <img src={profileIcons.storyCamera} alt="" />
                </span>
                <span>Выбрать фото или видео</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}