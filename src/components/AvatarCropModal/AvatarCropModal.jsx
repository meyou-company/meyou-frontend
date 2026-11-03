import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Cropper from "react-easy-crop";
import {
  AVATAR_CROP_MODE,
  AVATAR_PREVIEW_SIZE,
  drawAvatarCrop,
  getAvatarCropZoomConfig,
  normalizeAvatarCropMode,
} from "../../utils/avatarCrop";
import "./AvatarCropModal.scss";

export default function AvatarCropModal({
  src,
  onClose,
  onConfirm,
  aspect = 1,
  cropShape = "round",
  showGrid = false,
}) {
  const { t } = useTranslation();
  const isAvatarEditor = cropShape === "round";
  const [mode, setMode] = useState(AVATAR_CROP_MODE.FILL);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);
  const [cropSize, setCropSize] = useState(null);
  const areaRef = useRef(null);
  const imageRef = useRef(null);
  const previewRef = useRef(null);
  const croppedPixelsRef = useRef(null);
  const redrawPreviewRef = useRef(() => {});

  const zoomConfig = useMemo(
    () =>
      isAvatarEditor
        ? getAvatarCropZoomConfig(mode)
        : { min: 1, max: 3, step: 0.01, objectFit: "contain", restrictPosition: true },
    [isAvatarEditor, mode],
  );

  const redrawPreview = useCallback(
    (areaPixels) => {
      if (!isAvatarEditor) return;
      const image = imageRef.current;
      const canvas = previewRef.current;
      const pixels = areaPixels || croppedPixelsRef.current;
      if (!image || !canvas || !pixels) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawAvatarCrop(ctx, image, pixels, AVATAR_PREVIEW_SIZE, { mode });
    },
    [isAvatarEditor, mode],
  );
  redrawPreviewRef.current = redrawPreview;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el || !isAvatarEditor) {
      setCropSize(null);
      return undefined;
    }

    const update = () => {
      const inset = 2;
      const side = Math.max(80, Math.floor(Math.min(el.clientWidth, el.clientHeight) - inset * 2));
      setCropSize((prev) =>
        prev && prev.width === side && prev.height === side ? prev : { width: side, height: side },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isAvatarEditor, src, mode]);

  useEffect(() => {
    if (!src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      redrawPreviewRef.current();
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    redrawPreview();
  }, [redrawPreview]);

  const handleModeChange = (nextMode) => {
    const normalized = normalizeAvatarCropMode(nextMode);
    if (normalized === mode) return;
    setMode(normalized);
    setCrop({ x: 0, y: 0 });
    setZoom(getAvatarCropZoomConfig(normalized).defaultZoom);
  };

  const handleCropComplete = useCallback(
    (_area, areaPixels) => {
      croppedPixelsRef.current = areaPixels;
      setCroppedPixels(areaPixels);
      redrawPreview(areaPixels);
    },
    [redrawPreview],
  );

  const handleConfirm = () => {
    if (!croppedPixels) return;
    onConfirm(croppedPixels, isAvatarEditor ? { mode } : undefined);
  };

  return (
    <div className="cropm" role="dialog" aria-modal="true" aria-labelledby="cropm-title">
      <div className="cropm__overlay" onClick={onClose} />
      <div className="cropm__panel">
        <div id="cropm-title" className="cropm__title">
          {t("profile.avatarCrop.title")}
        </div>

        {isAvatarEditor ? (
          <div className="cropm__modes" role="radiogroup" aria-label={t("profile.avatarCrop.title")}>
            <button
              type="button"
              role="radio"
              aria-checked={mode === AVATAR_CROP_MODE.FILL}
              className={`cropm__mode${mode === AVATAR_CROP_MODE.FILL ? " is-active" : ""}`}
              onClick={() => handleModeChange(AVATAR_CROP_MODE.FILL)}
            >
              {t("profile.avatarCrop.fill")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === AVATAR_CROP_MODE.FIT}
              className={`cropm__mode${mode === AVATAR_CROP_MODE.FIT ? " is-active" : ""}`}
              onClick={() => handleModeChange(AVATAR_CROP_MODE.FIT)}
            >
              {t("profile.avatarCrop.fit")}
            </button>
          </div>
        ) : null}

        <div
          ref={areaRef}
          className={`cropm__cropArea${isAvatarEditor ? " cropm__cropArea--round" : " cropm__cropArea--rect"}`}
        >
          {isAvatarEditor && mode === AVATAR_CROP_MODE.FIT ? (
            <img className="cropm__blurBg" src={src} alt="" aria-hidden="true" />
          ) : null}
          {(!isAvatarEditor || cropSize) && (
            <Cropper
              key={`${src}-${isAvatarEditor ? mode : "photo"}`}
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={zoomConfig.min}
              maxZoom={zoomConfig.max}
              aspect={aspect ?? undefined}
              cropShape={cropShape}
              cropSize={isAvatarEditor ? cropSize : undefined}
              objectFit={zoomConfig.objectFit}
              restrictPosition={zoomConfig.restrictPosition}
              showGrid={showGrid}
              roundCropAreaPixels
              zoomWithScroll
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              style={{
                containerStyle: { background: "transparent" },
                mediaStyle: { willChange: "transform" },
              }}
            />
          )}
        </div>

        <div className={`cropm__controls${isAvatarEditor ? " cropm__controls--avatar" : ""}`}>
          <div className="cropm__zoom">
            <div className="cropm__label" id="cropm-zoom-label">
              {t("profile.avatarCrop.zoom")}
            </div>
            <input
              className="cropm__range"
              type="range"
              min={zoomConfig.min}
              max={zoomConfig.max}
              step={zoomConfig.step || 0.01}
              value={zoom}
              aria-labelledby="cropm-zoom-label"
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>

          {isAvatarEditor ? (
            <div className="cropm__preview">
              <div className="cropm__label">{t("profile.avatarCrop.preview")}</div>
              <canvas
                ref={previewRef}
                className="cropm__previewCanvas"
                width={AVATAR_PREVIEW_SIZE}
                height={AVATAR_PREVIEW_SIZE}
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>

        <div className="cropm__actions">
          <button type="button" className="cropm__btn ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="cropm__btn primary"
            onClick={handleConfirm}
            disabled={!croppedPixels}
          >
            {t("profile.avatarCrop.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
