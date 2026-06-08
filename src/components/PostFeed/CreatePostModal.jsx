import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import profileIcons from "../../constants/profileIcons";
import EmojiPickerButton from "../EmojiPicker/EmojiPickerButton";
import "./CreatePostModal.scss";

const TEXTAREA_MIN_PX = 72;
const TEXTAREA_MAX_VH = 0.28;

function syncComposerTextareaHeight(el) {
  if (!el) return;
  // On mobile we rely on CSS fixed height to avoid "compressed" feeling.
  if (window.innerWidth <= 480) {
    el.style.height = "";
    return;
  }
  const cap = Math.max(TEXTAREA_MIN_PX, Math.floor(window.innerHeight * TEXTAREA_MAX_VH));
  el.style.height = "auto";
  el.style.height = `${Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_PX), cap)}px`;
}

function parsePostLocation(location) {
  const text = (location ?? "").trim();
  if (!text) return { city: "", country: "" };
  const comma = text.indexOf(",");
  if (comma === -1) return { city: text, country: "" };
  return {
    city: text.slice(0, comma).trim(),
    country: text.slice(comma + 1).trim(),
  };
}

function ActionCard({
  icon,
  label,
  active,
  locationActive = false,
  onClick,
  ariaLabel,
}) {
  return (
    <button
      type="button"
      className={[
        "createPostModal__actionCard",
        active ? "createPostModal__actionCard--active" : "",
        locationActive ? "createPostModal__actionCard--locationActive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      aria-pressed={active}
    >
      <img src={icon} alt="" className="createPostModal__actionIcon" aria-hidden="true" />
      <span className="createPostModal__actionLabel">{label}</span>
    </button>
  );
}

/**
 * Модалка створення допису (premium pastel UI).
 */
export default function CreatePostModal({
  authorName,
  displayAvatar,
  showOnlineDot = false,
  text,
  onTextChange,
  placeholder,
  textareaRef,
  postMediaFiles = [],
  onRemoveMedia,
  postMediaInputRef,
  postVideoInputRef,
  onPhotoSelect,
  onVideoSelect,
  postLocation = "",
  onPostLocationChange,
  onClearLocation,
  locationPanelOpen = false,
  onToggleLocationPanel,
  onUseCurrentLocation,
  isDetectingLocation = false,
  isPublishing = false,
  onPublish,
  onClose,
  canPublish = false,
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('posts.placeholder');

  const { city, country } = useMemo(
    () => parsePostLocation(postLocation),
    [postLocation]
  );

  const hasPhoto = postMediaFiles.some((m) => m.type === "image");
  const hasVideo = postMediaFiles.some((m) => m.type === "video");
  const hasLocation = Boolean(postLocation.trim());
  const showLocationPanel = locationPanelOpen || hasLocation;

  const locationPanelRef = useRef(null);
  const prevShowLocationPanelRef = useRef(false);

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 480;
    const openedNow = showLocationPanel && !prevShowLocationPanelRef.current;

    if (isMobile && openedNow) {
      setTimeout(() => {
        locationPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }

    prevShowLocationPanelRef.current = showLocationPanel;
  }, [showLocationPanel]);

  useEffect(() => {
    syncComposerTextareaHeight(textareaRef?.current);
  }, [text, textareaRef, showLocationPanel, postMediaFiles.length]);

  const handleTextChange = useCallback(
    (next) => {
      onTextChange(next);
      requestAnimationFrame(() => syncComposerTextareaHeight(textareaRef?.current));
    },
    [onTextChange, textareaRef]
  );

  return (
    <div
      className="createPostModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
      onClick={onClose}
    >
      <div className="createPostModal__card" onClick={(e) => e.stopPropagation()}>
        <header className="createPostModal__header">
          <h2 id="create-post-title" className="createPostModal__title">
            {t('posts.create.title')}
          </h2>
          <button
            type="button"
            className="createPostModal__close"
            onClick={onClose}
            aria-label={t('posts.create.close')}
          >
            <img src={profileIcons.close} alt="" aria-hidden="true" />
          </button>
        </header>

        <div className="createPostModal__content">
          <div className="createPostModal__user">
            <div className="createPostModal__avatarWrap">
              <img
                src={displayAvatar}
                alt=""
                className="createPostModal__avatar"
              />
              {showOnlineDot ? (
                <span className="createPostModal__onlineDot" aria-hidden="true" />
              ) : null}
            </div>
            <div className="createPostModal__userMeta">
              <span className="createPostModal__userName">{authorName}</span>
            </div>
          </div>

          <div className="createPostModal__textareaWrap">
            <textarea
              ref={textareaRef}
              className="createPostModal__textarea"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={resolvedPlaceholder}
              rows={3}
              aria-labelledby="create-post-title"
            />
            <EmojiPickerButton
              inputRef={textareaRef}
              value={text}
              onChange={handleTextChange}
              className="createPostModal__emojiBtn"
              ariaLabel={t('posts.create.addEmoji')}
            />
          </div>

          <input
            ref={postMediaInputRef}
            type="file"
            accept="image/*"
            multiple
            className="createPostModal__fileInput"
            onChange={onPhotoSelect}
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            ref={postVideoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="createPostModal__fileInput"
            onChange={onVideoSelect}
            tabIndex={-1}
            aria-hidden="true"
          />

          <div className="createPostModal__actions">
            <ActionCard
              icon={profileIcons.live}
              label={t('posts.create.photo')}
              active={hasPhoto}
              onClick={() => postMediaInputRef?.current?.click()}
            />
            <ActionCard
              icon={profileIcons.video}
              label={t('posts.create.video')}
              active={hasVideo}
              onClick={() => postVideoInputRef?.current?.click()}
            />
            <ActionCard
              icon={profileIcons.location}
              label={t('posts.create.location')}
              active={hasLocation || locationPanelOpen}
              locationActive={hasLocation || locationPanelOpen}
              onClick={onToggleLocationPanel}
            />
            <ActionCard
              icon={profileIcons.layoutBlack}
              label={t('posts.create.more')}
              active={false}
              onClick={() => textareaRef?.current?.focus()}
              ariaLabel={t('posts.create.moreAria')}
            />
          </div>

          {postMediaFiles.length > 0 && (
            <div className="createPostModal__mediaGrid">
              {postMediaFiles.map((media) => (
                <div key={media.id} className="createPostModal__mediaItem">
                  {media.type === "video" ? (
                    <video
                      src={media.previewUrl}
                      className="createPostModal__mediaPreview"
                      controls
                    />
                  ) : (
                    <img
                      src={media.previewUrl}
                      alt=""
                      className="createPostModal__mediaPreview"
                    />
                  )}
                  <button
                    type="button"
                    className="createPostModal__mediaRemove"
                    onClick={() => onRemoveMedia?.(media.id)}
                    aria-label={t('posts.create.removeMedia')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {showLocationPanel && (
            <section
              ref={locationPanelRef}
              className="createPostModal__locationPanel"
              aria-label={t('posts.create.locationPanelAria')}
            >
              <h3 className="createPostModal__locationTitle">
                {t('posts.create.locationTitle')}
              </h3>
              <p className="createPostModal__locationSubtitle">
                {t('posts.create.locationSubtitle')}
              </p>

              <div className="createPostModal__mapPreview" aria-hidden="true">
                <span className="createPostModal__mapPin">📍</span>
              </div>

              {hasLocation ? (
                <div className="createPostModal__locationSelected">
                  <div className="createPostModal__locationSelectedText">
                    {city ? (
                      <span className="createPostModal__locationCity">{city}</span>
                    ) : null}
                    {country ? (
                      <span className="createPostModal__locationCountry">
                        {country}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="createPostModal__locationClear"
                    onClick={onClearLocation}
                    aria-label={t('posts.create.locationClear')}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="createPostModal__locationManual">
                  <span className="visually-hidden">{t('posts.create.locationPlaceholder')}</span>
                  <input
                    type="text"
                    className="createPostModal__locationInput"
                    value={postLocation}
                    onChange={(e) => onPostLocationChange?.(e.target.value)}
                    placeholder={t('posts.create.locationPlaceholder')}
                    autoComplete="off"
                  />
                </label>
              )}

              <button
                type="button"
                className="createPostModal__locationDetect"
                onClick={onUseCurrentLocation}
                disabled={isDetectingLocation}
                aria-busy={isDetectingLocation}
              >
                {isDetectingLocation
                  ? t('posts.create.locationDetecting')
                  : t('posts.create.locationDetect')}
              </button>
            </section>
          )}

          <footer className="createPostModal__footer">
            <button
              type="button"
              className="createPostModal__cancelBtn"
              onClick={onClose}
              disabled={isPublishing}
            >
              {t('posts.create.cancel')}
            </button>
            <button
              type="button"
              className="createPostModal__publishBtn"
              disabled={isPublishing || !canPublish}
              onClick={onPublish}
            >
              {isPublishing ? t('posts.create.publishing') : t('posts.create.publish')}
            </button>
          </footer>

          <p className="createPostModal__privacy">
            <span className="createPostModal__privacyLock" aria-hidden="true">
              🔒
            </span>
            <span>{t('posts.create.privacy')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
