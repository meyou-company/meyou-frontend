import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useThemeStore } from "../../zustand/useThemeStore";
import { insertEmojiAtCursor } from "../../utils/insertEmojiAtCursor";
import "./EmojiPickerButton.scss";

/**
 * Кнопка 😊 + popup emoji-picker-react.
 * Вставляє емодзі в textarea за ref; підтримує controlled value/onChange.
 */
export default function EmojiPickerButton({
  inputRef,
  value = "",
  onChange,
  className = "",
  pickerClassName = "",
  ariaLabel = "Додати емодзі",
  /** "inline" — компактна кнопка всередині поля вводу (коментарі) */
  variant = "default",
  /** Якщо задано — popup рендериться в цей контейнер (position: relative на ньому) */
  popoverContainerRef,
  /** Закрити popup після вибору emoji */
  closeOnSelect = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const pendingSelection = useRef(null);

  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const pickerTheme = effectiveTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  useLayoutEffect(() => {
    if (pendingSelection.current == null) return;
    const el = inputRef?.current;
    const pos = pendingSelection.current;
    pendingSelection.current = null;
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
  }, [value, inputRef]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const handleEmojiClick = useCallback(
    (emojiData) => {
      const emoji = emojiData?.emoji;
      if (!emoji || typeof onChange !== "function") return;
      const { nextValue, selectionStart } = insertEmojiAtCursor(
        value,
        emoji,
        inputRef?.current
      );
      pendingSelection.current = selectionStart;
      onChange(nextValue);
      if (closeOnSelect) setOpen(false);
    },
    [value, onChange, inputRef, closeOnSelect]
  );

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

  const isInline = variant === "inline";
  const anchorsToInputWrapper = Boolean(popoverContainerRef);

  const popoverNode =
    open ? (
      <div
        ref={popoverRef}
        className={[
          "emoji-picker-btn__popover",
          anchorsToInputWrapper ? "emoji-picker-btn__popover--inputWrapper" : "",
          pickerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-label="Вибір емодзі"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={pickerTheme}
          lazyLoadEmojis
          searchPlaceholder="Пошук…"
          previewConfig={{ showPreview: false }}
          width={300}
          height={360}
        />
      </div>
    ) : null;

  const popoverPortalTarget = popoverContainerRef?.current ?? null;

  return (
    <div
      ref={wrapRef}
      className={[
        "emoji-picker-btn",
        isInline ? "emoji-picker-btn--inline" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="emoji-picker-btn__trigger"
        onClick={toggleOpen}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="emoji-picker-btn__icon" aria-hidden="true">
          😊
        </span>
      </button>

      {popoverNode &&
        (popoverPortalTarget
          ? createPortal(popoverNode, popoverPortalTarget)
          : popoverNode)}
    </div>
  );
}
