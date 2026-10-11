import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { clampStoryTextPosition } from "../../utils/storySafeArea";

const STORY_TEXT_COLORS = [
  "#ffffff",
  "#111111",
  "#ff4fb1",
  "#4f6bff",
  "#ffd84f",
  "#44d17a",
];

const DRAG_THRESHOLD_PX = 6;

export default function StoryTextEditor({
  isOpen,
  text,
  color,
  fontSize,
  position,
  disabled,
  onTextChange,
  onColorChange,
  onFontSizeChange,
  onPositionChange,
  onClose,
  onRequestOpen,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const dragRef = useRef({
    pointerId: null,
    moved: false,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!isOpen || disabled) return undefined;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, disabled]);

  useEffect(() => {
    if (dragRef.current.pointerId != null) return;
    const overlay = overlayRef.current;
    const frame = overlay?.parentElement?.getBoundingClientRect();
    if (!frame?.width || !frame?.height) return;

    const next = clampStoryTextPosition({
      x: position.x,
      y: position.y,
      frameWidth: frame.width,
      frameHeight: frame.height,
      textWidth: overlay.offsetWidth,
      textHeight: overlay.offsetHeight,
    });
    if (next.x !== position.x || next.y !== position.y) {
      onPositionChange(next);
    }
  }, [text, fontSize, isOpen, onPositionChange, position.x, position.y]);

  const closePanel = () => {
    inputRef.current?.blur();
    onClose?.();
  };

  const applyPosition = (clientX, clientY) => {
    const overlay = overlayRef.current;
    const frame = overlay?.parentElement?.getBoundingClientRect();
    if (!frame?.width || !frame?.height) return;

    const next = clampStoryTextPosition({
      x: ((clientX - frame.left) / frame.width) * 100,
      y: ((clientY - frame.top) / frame.height) * 100,
      frameWidth: frame.width,
      frameHeight: frame.height,
      textWidth: overlay.offsetWidth,
      textHeight: overlay.offsetHeight,
    });
    onPositionChange(next);
  };

  const handlePointerDown = (event) => {
    if (disabled || event.button === 2) return;

    dragRef.current = {
      pointerId: event.pointerId,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (isOpen) event.preventDefault();
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;

    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    if (distance > DRAG_THRESHOLD_PX) drag.moved = true;
    if (disabled || !drag.moved) return;

    event.preventDefault();
    applyPosition(event.clientX, event.clientY);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    drag.pointerId = null;

    if (!drag.moved && !isOpen && !disabled) {
      onRequestOpen?.();
    }
  };

  if (!isOpen && !text.trim()) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className={`storyTextEditor__overlay ${!text.trim() ? "storyTextEditor__overlay--placeholder" : ""}`}
        style={{
          color,
          fontSize: `${fontSize}px`,
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("stories.moveText")}
        title={t("stories.moveText")}
      >
        {text.trim() || t("stories.textPlaceholder")}
      </div>

      {isOpen && (
        <div
          className="storyTextEditor__controls"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="storyTextEditor__controlsHead">
            <button
              type="button"
              className="storyTextEditor__close"
              onClick={closePanel}
              disabled={disabled}
              aria-label={t("stories.done")}
              title={t("stories.done")}
            >
              ✕
            </button>
            <button
              type="button"
              className="storyTextEditor__done"
              onClick={closePanel}
              disabled={disabled}
            >
              {t("stories.done")}
            </button>
          </div>

          <input
            ref={inputRef}
            type="text"
            className="storyTextEditor__input"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                closePanel();
              }
            }}
            maxLength={100}
            placeholder={t("stories.textPlaceholder")}
            disabled={disabled}
            enterKeyHint="done"
          />

          <div className="storyTextEditor__settings">
            <label className="storyTextEditor__size">
              <span className="storyTextEditor__sizeLabel">Aa</span>
              <input
                type="range"
                min="16"
                max="72"
                step="2"
                value={fontSize}
                onChange={(event) => onFontSizeChange(Number(event.target.value))}
                disabled={disabled}
                aria-label={t("stories.fontSize")}
              />
              <span className="storyTextEditor__sizeValue">{fontSize}</span>
            </label>

            <div className="storyTextEditor__colors" aria-label={t("stories.textColor")}>
              {STORY_TEXT_COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`storyTextEditor__color ${color === item ? "storyTextEditor__color--active" : ""}`}
                  style={{ backgroundColor: item }}
                  onClick={() => onColorChange(item)}
                  disabled={disabled}
                  aria-label={t("stories.pickColor", { color: item })}
                  title={item}
                  aria-pressed={color === item}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
