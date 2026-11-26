import { i18n } from "../../i18n";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../zustand/useAuthStore";
import { storiesApi } from "../../services/storiesApi";
import { uploadStoryMedia } from "../../services/storyMediaUploadApi";
import {
  getApiErrorCode,
  getApiErrorMessage,
} from "../../utils/getApiErrorMessage";
import { composeStoryImage } from "../../utils/composeStoryImage";
import { clampStoryTextPosition } from "../../utils/storySafeArea";
import { useStoriesOverlayLock } from "../../hooks/useStoriesOverlayLock";
import profileIcons from "../../constants/profileIcons";
import StoryTextEditor from "./StoryTextEditor";
import StoryCamera from "./StoryCamera";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import { LuX, LuTrash2 } from "react-icons/lu";
import { STORY_FILTERS } from "../../utils/storyFilters";
import { useStoryPhotoFilter } from "../../hooks/useStoryPhotoFilter";
import "./StoryUploadModal.scss";

const STORY_VISIBILITY_OPTIONS = [
  { value: "FOLLOWERS", label: "storyUpload.followers" },
  { value: "FRIENDS", label: "storyUpload.friends" },
  // { value: "CLOSE_FRIENDS", label: "Близкие друзья" },
  { value: "PUBLIC", label: "storyUpload.everyone" },
  { value: "ONLY_ME", label: "storyUpload.onlyMe" },
];

const STORY_PUBLISH_PHASE = {
  UPLOADING: "uploading",
  PROCESSING: "processing",
};

const DEFAULT_STORY_TEXT_POSITION = { x: 50, y: 45 };
const DEFAULT_STORY_TEXT_COLOR = "#ffffff";
const DEFAULT_STORY_TEXT_SIZE = 32;
const STORY_CAPTION_MAX_LENGTH = 25;

function getPublishPhaseLabel(phase, isVideo) {
  if (phase === STORY_PUBLISH_PHASE.UPLOADING) {
    return isVideo
      ? i18n.t("storyUpload.uploadingVideo")
      : i18n.t("storyUpload.uploadingPhoto");
  }

  if (phase === STORY_PUBLISH_PHASE.PROCESSING) {
    return isVideo
      ? i18n.t("storyUpload.processingVideo")
      : i18n.t("storyUpload.publishing");
  }

  return "";
}

function getStoryCreateErrorMessage(error) {
  if (getApiErrorCode(error) === "RATE_LIMITED") {
    return (
      getApiErrorMessage(error) || i18n.t("errors.RATE_LIMITED")
    );
  }

  const raw = getApiErrorMessage(error) || error?.message || "";
  const normalized = raw.toLowerCase();

  if (normalized.includes("50") || normalized.includes("24 hours")) {
    return i18n.t("storyUpload.dailyLimit");
  }

  if (normalized.includes("100 active") || normalized.includes("active stories")) {
    return i18n.t("storyUpload.activeLimit");
  }

  if (normalized.includes("60 seconds") || normalized.includes("60 секунд")) {
    return i18n.t("storyUpload.videoLimit");
  }

  return raw || i18n.t("storyUpload.publishError");
}

export default function StoryUploadModal({ isOpen, onClose, onCreated }) {
  const { t } = useTranslation();
  useStoriesOverlayLock(isOpen);
  const inputRef = useRef(null);
  const visibilityWrapRef = useRef(null);
  const mediaFrameRef = useRef(null);
  const photoPanelRef = useRef(null);
  const filterToggleRef = useRef(null);
  const filterDragRef = useRef(null);
  const suppressFilterClickRef = useRef(false);
  const [fileItem, setFileItem] = useState(null);
  const [text, setText] = useState("");
  const [storyText, setStoryText] = useState("");
  const [storyTextColor, setStoryTextColor] = useState(DEFAULT_STORY_TEXT_COLOR);
  const [storyTextSize, setStoryTextSize] = useState(DEFAULT_STORY_TEXT_SIZE);
  const [storyTextPosition, setStoryTextPosition] = useState(
    DEFAULT_STORY_TEXT_POSITION,
  );
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishPhase, setPublishPhase] = useState(null);
  const [visibility, setVisibility] = useState("FOLLOWERS");
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoPanel, setPhotoPanel] = useState(null);
  const [stickers, setStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [filterId, setFilterId] = useState("natural");
  const [filterIntensity, setFilterIntensity] = useState(0);
  const photoFilter = useStoryPhotoFilter(fileItem, filterId, filterIntensity);

  useEffect(() => {
    if (!isOpen || photoPanel !== "filters") return;
    const closeOutside = (event) => {
      if (photoPanelRef.current?.contains(event.target) || filterToggleRef.current?.contains(event.target)) return;
      setPhotoPanel(null);
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, [isOpen, photoPanel]);

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

  useEffect(() => {
    if (!isVisibilityOpen) return undefined;

    const handleOutsidePointerDown = (event) => {
      if (!visibilityWrapRef.current?.contains(event.target)) {
        setIsVisibilityOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };
  }, [isVisibilityOpen]);

  if (!isOpen) return null;

  const resetStoryText = () => {
    setPhotoPanel(null);
    setStickers([]);
    setSelectedSticker(null);
    setFilterId("natural");
    setFilterIntensity(0);
    setStoryText("");
    setStoryTextColor(DEFAULT_STORY_TEXT_COLOR);
    setStoryTextSize(DEFAULT_STORY_TEXT_SIZE);
    setStoryTextPosition(DEFAULT_STORY_TEXT_POSITION);
    setIsTextEditorOpen(false);
  };

  const reset = () => {
    if (fileItem?.previewUrl) {
      URL.revokeObjectURL(fileItem.previewUrl);
    }

    setFileItem(null);
    setText("");
    resetStoryText();
    setIsVisibilityOpen(false);
    setIsPublishing(false);
    setPublishPhase(null);
    setIsCameraOpen(false);
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
    resetStoryText();
    setIsVisibilityOpen(false);
    setIsCameraOpen(false);
  };

  const prepareStoryFile = (file, metadata = {}) => {
    if (!file) return;

    const isImage = file.type?.startsWith("image/");
    const isVideo = file.type?.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error(t("storyUpload.mediaOnly"));
      return;
    }

    if (fileItem?.previewUrl) {
      URL.revokeObjectURL(fileItem.previewUrl);
    }

    setText("");
    resetStoryText();
    setIsVisibilityOpen(false);
    setIsCameraOpen(false);

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
          filterBaked: Boolean(metadata.filterBaked),
        });
      };

      img.onerror = () => {
        setFileItem({
          file,
          type: "image",
          previewUrl,
          orientation: "unknown",
          filterBaked: Boolean(metadata.filterBaked),
        });
      };

      img.src = previewUrl;
      return;
    }

    const video = document.createElement("video");

    video.preload = "metadata";

    video.onloadedmetadata = () => {

      const durationSec = Math.max(
        1,
        Number(metadata.durationSec) || Math.ceil(video.duration || 0),
      );

      setFileItem({
        file,
        type: "video",
        previewUrl,
        orientation: "unknown",
        durationSec,
        filterBaked: Boolean(metadata.filterBaked),
      });
    };

    video.onerror = () => {
      setFileItem({
        file,
        type: "video",
        previewUrl,
        orientation: "unknown",
        durationSec: Math.max(1, Number(metadata.durationSec) || 1),
        filterBaked: Boolean(metadata.filterBaked),
      });
    };

    video.src = previewUrl;
  };

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    prepareStoryFile(file);
  };

  const handlePublish = async () => {
    if (photoFilter.busy || photoFilter.error) {
      if (photoFilter.error) toast.error(t("storyUpload.publishError"));
      return;
    }
    if (!fileItem?.file) {
      toast.error(t("storyUpload.chooseMediaFirst"));
      return;
    }

    if (fileItem.type === "video" && !fileItem.durationSec) {
      toast.error(t("storyUpload.durationError"));
      return;
    }

    try {
      setIsPublishing(true);
      const isVideo = fileItem.type === "video";
      const mediaFrame = mediaFrameRef.current?.getBoundingClientRect();
      const overlayEl = mediaFrameRef.current?.querySelector(".storyTextEditor__overlay");
      const position = clampStoryTextPosition({
        x: storyTextPosition.x,
        y: storyTextPosition.y,
        frameWidth: mediaFrame?.width,
        frameHeight: mediaFrame?.height,
        textWidth: overlayEl?.offsetWidth,
        textHeight: overlayEl?.offsetHeight,
      });
      const imageFile = photoFilter.result?.file || fileItem.file;
      const uploadFile = !isVideo && (storyText.trim() || stickers.length)
        ? await composeStoryImage({
            file: imageFile,
            stickers,
            text: storyText,
            color: storyTextColor,
            fontSize: storyTextSize,
            position,
            frameWidth: mediaFrame?.width,
            frameHeight: mediaFrame?.height,
            fit: "contain",
          })
        : imageFile;

      setPublishPhase(STORY_PUBLISH_PHASE.UPLOADING);
      const uploaded = await uploadStoryMedia(uploadFile, {
        durationSec: isVideo ? fileItem.durationSec : undefined,
      });

      setPublishPhase(STORY_PUBLISH_PHASE.PROCESSING);
      const normalizedCaption = text.trim();
      const normalizedOverlayText = storyText.trim();
      const captionDuplicatesOverlay =
        fileItem.type === "image" &&
        normalizedOverlayText &&
        normalizedCaption.localeCompare(normalizedOverlayText, undefined, {
          sensitivity: "base",
        }) === 0;

      const created = await storiesApi.create({
        mediaUrl: uploaded.mediaUrl,
        mediaType: uploaded.mediaType,
        text: captionDuplicatesOverlay ? "" : normalizedCaption,
        visibility,
        durationSec:
          fileItem.type === "video"
            ? Math.max(1, fileItem.durationSec)
            : undefined,
      });

      toast.success(t("storyUpload.published"));
      onCreated?.(created);
      handleClose();
    } catch (e) {
      console.error("[story-upload] failed", e);
      toast.error(getStoryCreateErrorMessage(e));
      setIsPublishing(false);
      setPublishPhase(null);
    }
  };

  return (
    <div
      className={`storyUploadModal ${fileItem || isCameraOpen ? "storyUploadModal--editorMode" : ""} ${isCameraOpen ? "storyUploadModal--cameraMode" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={t("stories.createTitle")}
    >
      <div className="storyUploadModal__page">
        <div className="storyUploadModal__bgDots" aria-hidden="true" />

        {publishPhase && (
          <div
            className="storyUploadModal__publishOverlay"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="storyUploadModal__publishSpinner" aria-hidden="true" />
            <p className="storyUploadModal__publishText">
              {getPublishPhaseLabel(publishPhase, fileItem?.type === "video")}
            </p>
            {fileItem?.type === "video" && fileItem.durationSec > 60 && (
              <p className="storyUploadModal__publishHint">
                {t("storyUpload.trimNotice")}
              </p>
            )}
          </div>
        )}

        <div
          className={`storyUploadModal__content ${fileItem || isCameraOpen ? "storyUploadModal__content--editor" : ""
            }`}
        >
          {!fileItem && !isCameraOpen && (
            <>
              <div className="storyUploadModal__head">
                <button
                  type="button"
                  className="storyUploadModal__close"
                  onClick={handleClose}
                  aria-label={t("common.close")}
                >
                  <img
                    src={profileIcons.close}
                    className="storyUploadModal_closeIcon"
                    alt=""
                  />
                </button>

                <h3 className="storyUploadModal__title">{t("stories.createTitle")}</h3>

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

          {isCameraOpen ? (
            <StoryCamera
              onClose={() => setIsCameraOpen(false)}
              onCapture={prepareStoryFile}
            />
          ) : fileItem ? (
            <div className="storyUploadModal__editor">
              <div className="storyUploadModal__editorCard">
                <div className="storyUploadModal__editorTop">
                  <button
                    type="button"
                    className="storyUploadModal__editorBack"
                    onClick={handleBackToPicker}
                    aria-label={t("common.back")}
                  >
                    <img src={profileIcons.storyBack} alt="" />
                  </button>

                  <div className="storyUploadModal__editorTools">
                    <button
                      type="button"
                      className={`storyUploadModal__editorTool ${isTextEditorOpen ? "storyUploadModal__editorTool--active" : ""}`}
                      onClick={() => { setPhotoPanel(null); setIsTextEditorOpen((prev) => !prev); }}
                      disabled={fileItem.type !== "image" || isPublishing}
                      aria-label={t("stories.addText")}
                      aria-pressed={isTextEditorOpen}
                      title={
                        fileItem.type === "image"
                          ? t("stories.addText")
                          : t("stories.textPhotoOnly")
                      }
                    >
                      <span className="storyUploadModal__editorToolIcon storyUploadModal__editorToolIcon--text">
                        Aa
                      </span>
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                      aria-label={t("stories.stickers")}
                      title={t("stories.stickers")}
                      disabled={fileItem.type !== "image" || isPublishing}
                      aria-pressed={photoPanel === "emoji"}
                      onClick={() => { setIsTextEditorOpen(false); setPhotoPanel(photoPanel === "emoji" ? null : "emoji"); }}
                    >
                      <img src={profileIcons.storySticker} alt="" />
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                      aria-label={t("stories.music")}
                      title={t("stories.music")}
                      onClick={() => toast.info(t("stories.musicComingSoon"))}
                    >
                      <img src={profileIcons.storyEditorMusic} alt="" />
                    </button>

                    <button
                      type="button"
                      className="storyUploadModal__editorTool"
                      aria-label={t("storyCamera.filters")}
                      ref={filterToggleRef}
                      title={t("storyCamera.filters")}
                      disabled={fileItem.type !== "image" || isPublishing}
                      aria-pressed={photoPanel === "filters"}
                      onClick={() => { setIsTextEditorOpen(false); setPhotoPanel(photoPanel === "filters" ? null : "filters"); }}
                    >
                      <img src={profileIcons.storyBrush} alt="" />
                    </button>

                  </div>
                </div>

                <div
                  ref={mediaFrameRef}
                  aria-busy={photoFilter.busy}
                  onPointerDown={(event) => {
                    if (event.target.classList.contains("storyUploadModal__editorMedia")) setSelectedSticker(null);
                  }}
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
                      src={photoFilter.result?.url || fileItem.previewUrl}
                      alt=""
                      className="storyUploadModal__editorMedia"
                    />
                  )}

                  <div className="storySafeMask storySafeMask--top" aria-hidden="true" />
                  <div className="storySafeMask storySafeMask--bottom" aria-hidden="true" />
                  {stickers.map((sticker) => <button key={sticker.id} type="button"
                    className={`storyPhotoSticker${selectedSticker === sticker.id ? " is-selected" : ""}`}
                    style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, fontSize: sticker.size }}
                    aria-label={sticker.emoji}
                    onClick={() => setSelectedSticker(sticker.id)}
                    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setSelectedSticker(sticker.id); }}
                    onPointerMove={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      const frame = mediaFrameRef.current.getBoundingClientRect();
                      const half = sticker.size / 2;
                      const x = Math.max(half / frame.width * 100, Math.min(100 - half / frame.width * 100, (event.clientX - frame.left) / frame.width * 100));
                      const y = Math.max(half / frame.height * 100, Math.min(100 - half / frame.height * 100, (event.clientY - frame.top) / frame.height * 100));
                      setStickers(previous => previous.map(item => item.id === sticker.id ? {...item, x, y} : item));
                    }}
                  >{sticker.emoji}</button>)}

                  {fileItem.type === "image" && (
                    <StoryTextEditor
                      isOpen={isTextEditorOpen}
                      text={storyText}
                      color={storyTextColor}
                      fontSize={storyTextSize}
                      position={storyTextPosition}
                      disabled={isPublishing}
                      onTextChange={setStoryText}
                      onColorChange={setStoryTextColor}
                      onFontSizeChange={setStoryTextSize}
                      onPositionChange={setStoryTextPosition}
                      onClose={() => setIsTextEditorOpen(false)}
                      onRequestOpen={() => setIsTextEditorOpen(true)}
                    />
                  )}
                </div>

                <div className="storyUploadModal__captionWrap">
                  <textarea
                    className="storyUploadModal__caption"
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, STORY_CAPTION_MAX_LENGTH))}
                    placeholder={t("storyUpload.caption")}
                    rows={1}
                    maxLength={STORY_CAPTION_MAX_LENGTH}
                    disabled={isPublishing}
                  />
                  <span className="storyUploadModal__captionCount">
                    {text.length}/{STORY_CAPTION_MAX_LENGTH}
                  </span>
                </div>
              </div>

              {photoPanel && <div ref={photoPanelRef} className={`storyPhotoPanel storyPhotoPanel--${photoPanel}`}>
                <button className="storyPhotoPanel__close" type="button" aria-label={t("common.close")} onClick={() => setPhotoPanel(null)}><LuX /></button>
                {photoPanel === "emoji" ? <EmojiPicker width="100%" height={240} theme="dark" emojiStyle={EmojiStyle.NATIVE} previewConfig={{showPreview:false}} skinTonesDisabled autoFocusSearch={false} searchPlaceholder={t("common.search")} lazyLoadEmojis onEmojiClick={({emoji}) => {
                  const id = crypto.randomUUID();
                  setStickers(previous => [...previous, {id, emoji, x:50, y:50, size:48}]);
                  setSelectedSticker(id); setPhotoPanel(null);
                }} /> : <>
                  <div className="storyPhotoPanel__filters"
                    onWheel={(event) => { event.currentTarget.scrollLeft += event.deltaY; }}
                    onPointerDown={(event) => {
                      if (event.pointerType !== "mouse" || event.button !== 0) return;
                      suppressFilterClickRef.current = false;
                      filterDragRef.current = {x: event.clientX, scrollLeft: event.currentTarget.scrollLeft};
                    }}
                    onPointerMove={(event) => {
                      const drag = filterDragRef.current;
                      if (!drag) return;
                      const distance = event.clientX - drag.x;
                      if (Math.abs(distance) < 5 && !suppressFilterClickRef.current) return;
                      suppressFilterClickRef.current = true;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      event.currentTarget.classList.add("is-dragging");
                      event.currentTarget.scrollLeft = drag.scrollLeft - distance;
                    }}
                    onPointerUp={(event) => {
                      filterDragRef.current = null;
                      event.currentTarget.classList.remove("is-dragging");
                    }}
                    onPointerCancel={(event) => {
                      filterDragRef.current = null;
                      suppressFilterClickRef.current = false;
                      event.currentTarget.classList.remove("is-dragging");
                    }}
                    onPointerLeave={() => { filterDragRef.current = null; }}
                    onClickCapture={(event) => {
                      if (!suppressFilterClickRef.current) return;
                      event.preventDefault();
                      event.stopPropagation();
                      suppressFilterClickRef.current = false;
                    }}
                  >
                    {STORY_FILTERS.map(filter => <button type="button" key={filter.id} aria-pressed={filter.id === filterId} onClick={() => { setFilterId(filter.id); if (!filterIntensity) setFilterIntensity(70); }}>
                      <span style={{background:filter.swatch}} />{t(`cameraFilters.${filter.id}`)}
                    </button>)}
                  </div>
                  <label className="storyPhotoPanel__intensity">{t("storyCamera.intensity")}
                    <input type="range" min="0" max="100" value={filterIntensity} onChange={event => setFilterIntensity(Number(event.target.value))} />
                    <output>{filterIntensity}%</output>
                  </label>
                </>}
              </div>}
              {selectedSticker && <div className="storyPhotoStickerTools">
                <input aria-label={t("stories.stickers")} type="range" min="24" max="100" value={stickers.find(item => item.id === selectedSticker)?.size || 48} onChange={event => setStickers(previous => previous.map(item => item.id === selectedSticker ? {...item, size:Number(event.target.value)} : item))} />
                <button type="button" aria-label={t("common.delete")} onClick={() => { setStickers(previous => previous.filter(item => item.id !== selectedSticker)); setSelectedSticker(null); }}><LuTrash2 /></button>
                <button type="button" aria-label={t("common.close")} onClick={() => setSelectedSticker(null)}><LuX /></button>
              </div>}
              <div className="storyUploadModal__bottomActions">
                <button type="button" className="storyUploadModal__audienceBtn" onClick={handlePublish}
                  disabled={isPublishing || photoFilter.busy}>
                  <span className="storyUploadModal__audienceAvatar">
                    <img src={currentUserAvatar} alt="" />
                  </span>
                  <span>{t("storyUpload.yourStory")}</span>
                </button>

                <div
                  ref={visibilityWrapRef}
                  className="storyUploadModal__visibilityWrap"
                >
                  <button
                    type="button"
                    className="storyUploadModal__audienceBtn"
                    onClick={() => setIsVisibilityOpen((prev) => !prev)}
                    disabled={isPublishing}
                  >
                    <span className="storyUploadModal__closeFriendsIcon">
                      <img src={profileIcons.storyVisibility || profileIcons.storyCloseFriends} alt="" />
                    </span>
                    <span>{t("storyUpload.visibility")}</span>
                  </button>

                  {isVisibilityOpen && (
                    <div className="storyUploadModal__visibilityMenu">
                      <p className="storyUploadModal__visibilityTitle">
                        {t("storyUpload.whoCanView")}
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
                          <span>{t(option.label)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="storyUploadModal__nextBtn"
                  onClick={handlePublish}
                  disabled={isPublishing || photoFilter.busy}
                  aria-label={t("storyUpload.publish")}
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
                  <img src={profileIcons.storyGallery} alt="" />
                </span>
                <span>{t("storyUpload.chooseMedia")}</span>
              </button>
              <button
                type="button"
                className="storyUploadModal__pickFileBtn storyUploadModal__pickFileBtn--camera"
                onClick={() => setIsCameraOpen(true)}
                disabled={isPublishing}
              >
                <span className="storyUploadModal__pickFileIcon">
                  <img src={profileIcons.storyCamera} alt="" />
                </span>
                <span>{t("storyUpload.openCamera")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
