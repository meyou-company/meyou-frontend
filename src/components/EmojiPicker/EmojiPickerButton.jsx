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

const MOBILE_MAX = 768;
const DESKTOP_WIDTH = 320;
const DESKTOP_MAX_HEIGHT = 360;
const GAP = 8;
const VIEWPORT_PAD = 12;
const Z_INDEX_PICKER = 10050;

function useMobilePicker() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function getPortalRoot() {
  if (typeof document === "undefined") return null;
  const id = "emoji-picker-portal-root";
  let root = document.getElementById(id);
  if (!root) {
    root = document.createElement("div");
    root.id = id;
    document.body.appendChild(root);
  }
  return root;
}

function computeDesktopPosition(triggerRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(DESKTOP_WIDTH, vw - VIEWPORT_PAD * 2);
  const height = Math.min(DESKTOP_MAX_HEIGHT, vh - VIEWPORT_PAD * 2);

  const spaceAbove = triggerRect.top - VIEWPORT_PAD;
  const spaceBelow = vh - triggerRect.bottom - VIEWPORT_PAD;

  let placement = "above";
  if (spaceAbove >= height + GAP) {
    placement = "above";
  } else if (spaceBelow >= height + GAP) {
    placement = "below";
  } else {
    placement = spaceBelow > spaceAbove ? "below" : "above";
  }

  let top =
    placement === "above"
      ? triggerRect.top - height - GAP
      : triggerRect.bottom + GAP;

  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - height - VIEWPORT_PAD));

  let left = triggerRect.right - width;
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD));

  return { top, left, width, height, placement };
}

function getMobilePickerSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxHeight = Math.floor(vh * 0.45);
  return { width: vw, height: maxHeight };
}

/**
 * Кнопка 😊 + popup emoji-picker-react.
 * layout="post" — responsive portal (mobile bottom sheet, desktop біля кнопки).
 * layout="messenger" — те саме на mobile, anchored над полем на desktop.
 * layout="anchored" (default) — popup над полем вводу.
 */
export default function EmojiPickerButton({
  inputRef,
  value = "",
  onChange,
  className = "",
  pickerClassName = "",
  ariaLabel = "Додати емодзі",
  variant = "default",
  layout = "anchored",
  popoverContainerRef,
  closeOnSelect = false,
}) {
  const [open, setOpen] = useState(false);
  const [desktopCoords, setDesktopCoords] = useState({
    top: 0,
    left: 0,
    width: DESKTOP_WIDTH,
    height: DESKTOP_MAX_HEIGHT,
    placement: "above",
  });
  const [mobileSize, setMobileSize] = useState(() => getMobilePickerSize());
  const [positionReady, setPositionReady] = useState(false);

  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const pendingSelection = useRef(null);
  const isMobile = useMobilePicker();
  const usesPortalLayout =
    layout === "post" || (layout === "messenger" && isMobile);
  const usesAnchoredLayout =
    layout === "anchored" || (layout === "messenger" && !isMobile);

  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const pickerTheme = effectiveTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  const updatePosition = useCallback(() => {
    if (!usesPortalLayout) return;
    if (isMobile) {
      setMobileSize(getMobilePickerSize());
      return;
    }
    const trigger = wrapRef.current?.querySelector(".emoji-picker-btn__trigger");
    if (!trigger) return;
    setDesktopCoords(computeDesktopPosition(trigger.getBoundingClientRect()));
  }, [isMobile, usesPortalLayout]);

  useLayoutEffect(() => {
    if (!open || !usesPortalLayout) {
      setPositionReady(false);
      return;
    }
    updatePosition();
    requestAnimationFrame(() => {
      updatePosition();
      setPositionReady(true);
    });
  }, [open, updatePosition, usesPortalLayout]);

  useEffect(() => {
    if (!open || !usesPortalLayout) return;
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition, usesPortalLayout]);

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
    if (!open || !usesPortalLayout || !isMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isMobile, usesPortalLayout]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onOutsideClick = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };

    if (usesPortalLayout) {
      document.addEventListener("keydown", onEscape);
      const timer = window.setTimeout(() => {
        document.addEventListener("click", onOutsideClick, true);
      }, 0);
      return () => {
        window.clearTimeout(timer);
        document.removeEventListener("keydown", onEscape);
        document.removeEventListener("click", onOutsideClick, true);
      };
    }

    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("touchstart", onOutsideClick, { passive: true });
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("touchstart", onOutsideClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, usesPortalLayout]);

  const handleEmojiClick = useCallback(
    (emojiData) => {
      const emoji = emojiData?.emoji;
      if (!emoji || typeof onChange !== "function") return;
      const { nextValue, selectionStart } = insertEmojiAtCursor(
        value,
        emoji,
        inputRef?.current,
      );
      pendingSelection.current = selectionStart;
      onChange(nextValue);
      if (closeOnSelect) setOpen(false);
    },
    [value, onChange, inputRef, closeOnSelect],
  );

  const closePicker = useCallback(() => setOpen(false), []);

  const toggleOpen = (e) => {
    if (usesPortalLayout) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen((prev) => !prev);
  };

  const isInline = variant === "inline";
  const anchorsToInputWrapper = Boolean(popoverContainerRef);

  const pickerWidth = usesPortalLayout
    ? isMobile
      ? mobileSize.width
      : desktopCoords.width
    : 300;
  const pickerHeight = usesPortalLayout
    ? isMobile
      ? mobileSize.height
      : desktopCoords.height
    : 360;

  const postPortalContent =
    usesPortalLayout && open && getPortalRoot()
      ? createPortal(
          <>
            {isMobile ? (
              <button
                type="button"
                className="emoji-picker-btn__overlay"
                aria-label="Закрити вибір емодзі"
                onClick={closePicker}
              />
            ) : null}
            <div
              ref={popoverRef}
              className={[
                "emoji-picker-btn__popover",
                isMobile
                  ? "emoji-picker-btn__popover--mobile"
                  : "emoji-picker-btn__popover--desktop",
                positionReady ? "emoji-picker-btn__popover--ready" : "",
                pickerClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                isMobile
                  ? { zIndex: Z_INDEX_PICKER }
                  : {
                      position: "fixed",
                      top: desktopCoords.top,
                      left: desktopCoords.left,
                      width: desktopCoords.width,
                      maxHeight: desktopCoords.height,
                      zIndex: Z_INDEX_PICKER,
                    }
              }
              role="dialog"
              aria-label="Вибір емодзі"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={pickerTheme}
                lazyLoadEmojis
                searchPlaceholder="Пошук…"
                previewConfig={{ showPreview: false }}
                width={pickerWidth}
                height={pickerHeight}
              />
            </div>
          </>,
          getPortalRoot(),
        )
      : null;

  const anchoredPopoverNode =
    usesAnchoredLayout && open ? (
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
          width={pickerWidth}
          height={pickerHeight}
        />
      </div>
    ) : null;

  const anchoredPortalTarget = popoverContainerRef?.current ?? null;

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

      {usesPortalLayout
        ? postPortalContent
        : anchoredPopoverNode &&
          (anchoredPortalTarget
            ? createPortal(anchoredPopoverNode, anchoredPortalTarget)
            : anchoredPopoverNode)}
    </div>
  );
}
