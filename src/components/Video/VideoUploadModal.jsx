import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { videosApi } from "../../services/videosApi";
import {
  generateVideoThumbnailFromFile,
  getVideoDurationSeconds,
  uploadVideoMedia,
  uploadVideoThumbnail,
} from "../../services/videoMediaUploadApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { detectCurrentLocationLabel } from "../../utils/postGeolocation";
import profileIcons from "../../constants/profileIcons";
import "./VideoUploadModal.scss";

export default function VideoUploadModal({ isOpen, onClose, onCreated }) {
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addLocationEnabled, setAddLocationEnabled] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  if (!isOpen) return null;

  const reset = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);

    setTitle("");
    setDescription("");
    setAddLocationEnabled(false);
    setLocationText("");
    setIsDetectingLocation(false);
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoPreviewUrl("");
    setThumbnailPreviewUrl("");
    setIsPublishing(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleLocationToggle = (e) => {
    const checked = e.target.checked;
    setAddLocationEnabled(checked);
    if (!checked) {
      setLocationText("");
    }
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const label = await detectCurrentLocationLabel();
      if (label) {
        setLocationText(label);
        setAddLocationEnabled(true);
      } else {
        toast.error("Не удалось определить локацию. Введите вручную.");
      }
    } catch (err) {
      console.error("[video-upload] geolocation failed", err);
      toast.error("Доступ к геолокации запрещён. Введите локацию вручную.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type?.startsWith("video/")) {
      toast.error("Можно загрузить только видео");
      return;
    }

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Превью должно быть изображением");
      return;
    }

    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Введите название видео");
      return;
    }
    if (trimmedTitle.length > 15) {
      toast.error("Название — не более 15 символов");
      return;
    }

    if (!videoFile) {
      toast.error("Выберите видеофайл");
      return;
    }

    try {
      setIsPublishing(true);

      const [{ mediaUrl: videoUrl }, duration] = await Promise.all([
        uploadVideoMedia(videoFile),
        getVideoDurationSeconds(videoFile),
      ]);

      let thumbnailUrl;
      if (thumbnailFile) {
        const uploaded = await uploadVideoThumbnail(thumbnailFile);
        thumbnailUrl = uploaded.mediaUrl;
      } else {
        try {
          const autoThumb = await generateVideoThumbnailFromFile(videoFile, 1);
          const uploaded = await uploadVideoThumbnail(autoThumb);
          thumbnailUrl = uploaded.mediaUrl;
        } catch (autoThumbError) {
          console.warn("[video-upload] auto thumbnail at 1s failed", autoThumbError);
          const autoThumb = await generateVideoThumbnailFromFile(videoFile, 0);
          const uploaded = await uploadVideoThumbnail(autoThumb);
          thumbnailUrl = uploaded.mediaUrl;
        }
      }

      const payload = {
        title: trimmedTitle,
        videoUrl,
      };

      const trimmedDescription = description.trim();
      if (trimmedDescription) payload.description = trimmedDescription;
      if (thumbnailUrl) payload.thumbnailUrl = thumbnailUrl;
      if (duration > 0) payload.duration = duration;

      if (addLocationEnabled) {
        const trimmedLocation = locationText.trim();
        if (trimmedLocation) payload.location = trimmedLocation;
      }

      const created = await videosApi.create(payload);

      toast.success("Видео добавлено");
      onCreated?.(created);
      handleClose();
    } catch (err) {
      console.error("[video-upload] failed", err);
      toast.error(getApiErrorMessage(err) || err?.message || "Не удалось добавить видео");
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="videoUploadModal"
      role="dialog"
      aria-modal="true"
      aria-label="Добавить видео"
    >
      <div className="videoUploadModal__backdrop" onClick={handleClose} />

      <div className="videoUploadModal__panel">
        <div className="videoUploadModal__head">
          <h2 className="videoUploadModal__title">Добавить видео</h2>
          <button
            type="button"
            className="videoUploadModal__close"
            onClick={handleClose}
            aria-label="Закрыть"
          >
            <img src={profileIcons.close} alt="" />
          </button>
        </div>

        <form className="videoUploadModal__form" onSubmit={handleSubmit}>
          <label className="videoUploadModal__field">
            <span className="videoUploadModal__label">Название *</span>
            <input
              className="videoUploadModal__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название видео (до 15 символов)"
              maxLength={15}
              disabled={isPublishing}
            />
          </label>

          <label className="videoUploadModal__field">
            <span className="videoUploadModal__label">Описание</span>
            <textarea
              className="videoUploadModal__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание (до 50 символов)"
              rows={2}
              maxLength={50}
              disabled={isPublishing}
            />
          </label>

          <div className="videoUploadModal__field">
            <label className="videoUploadModal__switchRow">
              <input
                type="checkbox"
                className="videoUploadModal__switchInput"
                checked={addLocationEnabled}
                onChange={handleLocationToggle}
                disabled={isPublishing}
              />
              <span className="videoUploadModal__switchLabel">Добавить локацию</span>
            </label>

            {addLocationEnabled && (
              <div className="videoUploadModal__locationBlock">
                <input
                  className="videoUploadModal__input"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="Город, страна"
                  maxLength={200}
                  disabled={isPublishing || isDetectingLocation}
                />
                <button
                  type="button"
                  className="videoUploadModal__pickBtn videoUploadModal__pickBtn--secondary"
                  onClick={handleDetectLocation}
                  disabled={isPublishing || isDetectingLocation}
                >
                  {isDetectingLocation ? "Определяем..." : "Определить мою локацию"}
                </button>
              </div>
            )}
          </div>

          <div className="videoUploadModal__field">
            <span className="videoUploadModal__label">Видео *</span>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="videoUploadModal__fileInput"
              onChange={handleVideoSelect}
              disabled={isPublishing}
            />
            <button
              type="button"
              className="videoUploadModal__pickBtn"
              onClick={() => videoInputRef.current?.click()}
              disabled={isPublishing}
            >
              {videoFile ? "Заменить видео" : "Выбрать видео"}
            </button>
            {videoPreviewUrl && (
              <video
                className="videoUploadModal__preview"
                src={videoPreviewUrl}
                controls
                muted
              />
            )}
          </div>

          <div className="videoUploadModal__field">
            <span className="videoUploadModal__label">Обложка (необязательно)</span>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="videoUploadModal__fileInput"
              onChange={handleThumbnailSelect}
              disabled={isPublishing}
            />
            <button
              type="button"
              className="videoUploadModal__pickBtn videoUploadModal__pickBtn--secondary"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={isPublishing}
            >
              {thumbnailFile ? "Заменить превью" : "Выбрать превью"}
            </button>
            {thumbnailPreviewUrl && (
              <img
                className="videoUploadModal__thumbPreview"
                src={thumbnailPreviewUrl}
                alt=""
              />
            )}
          </div>

          <button
            type="submit"
            className="videoUploadModal__submit"
            disabled={isPublishing}
          >
            {isPublishing ? "Загрузка..." : "Опубликовать"}
          </button>
        </form>
      </div>
    </div>
  );
}
