import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../zustand/useThemeStore";
import { insertEmojiAtCursor } from "../../utils/insertEmojiAtCursor";
import { toLunmeyoToken } from "../../utils/lunmeyoToken";
import {
  MOBILE_MAX,
  TAB_BAR_HEIGHT,
  Z_INDEX_PICKER,
  computeDesktopPosition,
  computeMobilePosition,
} from "../../utils/emojiPickerPosition";
import LunmeyoPickerPanel from "../Lunmeyo/LunmeyoPickerPanel";
import "./EmojiPickerButton.scss";

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

/**
 * Shared 😊 picker for chats, comments, posts, Live, and Luna.
 * Always portals to document.body so parent overflow cannot clip it.
 */
export default function EmojiPickerButton({
  inputRef,
  value = "",
  onChange,
  className = "",
  pickerClassName = "",
  ariaLabel = "Додати емодзі",
  variant = "default",
  layout: _layout = "anchored",
  popoverContainerRef: _popoverContainerRef,
  closeOnSelect = false,
  enableLunmeyo = true,
  onSelectLunmeyo,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("emoji");
  const [emojiPickerMod, setEmojiPickerMod] = useState(null);
  const { t } = useTranslation();
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 380,
    height: 480,
    placement: "above",
    bottom: 0,
  });
  const [positionReady, setPositionReady] = useState(false);

  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const pendingSelection = useRef(null);
  const isMobile = useMobilePicker();

  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const pickerTheme =
    emojiPickerMod?.Theme &&
    (effectiveTheme === "dark"
      ? emojiPickerMod.Theme.DARK
      : emojiPickerMod.Theme.LIGHT);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    import("emoji-picker-react")
      .then((mod) => {
        if (!cancelled) setEmojiPickerMod(mod);
      })
      .catch((err) => {
        console.error("[emoji-picker] load failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const updatePosition = useCallback(() => {
    const trigger = wrapRef.current?.querySelector(".emoji-picker-btn__trigger");
    const rect = trigger?.getBoundingClientRect() ?? {
      top: window.innerHeight - 72,
      bottom: window.innerHeight - 28,
      left: window.innerWidth - 72,
      right: window.innerWidth - 28,
      width: 44,
      height: 44,
    };
    if (isMobile) {
      const mobile = computeMobilePosition(rect, {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        visualViewport: window.visualViewport,
      });
      setCoords((prev) => ({ ...prev, ...mobile, placement: "above" }));
      return;
    }
    setCoords(
      computeDesktopPosition(rect, {
        vw: window.innerWidth,
        vh: window.innerHeight,
      }),
    );
  }, [isMobile]);

  useLayoutEffect(() => {
    if (!open) {
      setPositionReady(false);
      return;
    }
    updatePosition();
    const frame = requestAnimationFrame(() => {
      updatePosition();
      setPositionReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    window.visualViewport?.addEventListener("resize", onReposition);
    window.visualViewport?.addEventListener("scroll", onReposition);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      window.visualViewport?.removeEventListener("resize", onReposition);
      window.visualViewport?.removeEventListener("scroll", onReposition);
    };
  }, [open, updatePosition]);

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
    if (!open || !isMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isMobile]);

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
    document.addEventListener("keydown", onEscape);
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onOutsideClick, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("pointerdown", onOutsideClick, true);
    };
  }, [open]);

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

  const handleLunmeyoSelect = useCallback(
    (item) => {
      if (!item?.id) return;
      if (typeof onSelectLunmeyo === "function") {
        onSelectLunmeyo(item);
        setOpen(false);
        return;
      }
      if (typeof onChange !== "function") return;
      const token = toLunmeyoToken(item.id);
      const { nextValue, selectionStart } = insertEmojiAtCursor(
        value,
        token,
        inputRef?.current,
      );
      pendingSelection.current = selectionStart;
      onChange(nextValue);
      if (closeOnSelect) setOpen(false);
    },
    [onSelectLunmeyo, onChange, value, inputRef, closeOnSelect],
  );

  const closePicker = useCallback(() => setOpen(false), []);

  const toggleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const isInline = variant === "inline";
  const pickerWidth = coords.width;
  const pickerHeight = coords.height;
  const emojiHeight = enableLunmeyo
    ? Math.max(220, pickerHeight - TAB_BAR_HEIGHT)
    : pickerHeight;

  const pickerBody = (
    <div className={`emoji-picker-btn__body${enableLunmeyo ? " has-lunmeyo" : ""}`}>
      {enableLunmeyo ? (
        <div className="emoji-picker-btn__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={tab === "emoji" ? "is-on" : ""}
            aria-selected={tab === "emoji"}
            onClick={() => setTab("emoji")}
          >
            {t("lunmeyo.tabs.emoji")}
          </button>
          <button
            type="button"
            role="tab"
            className={tab === "stickers" ? "is-on" : ""}
            aria-selected={tab === "stickers"}
            onClick={() => setTab("stickers")}
          >
            {t("lunmeyo.tabs.stickers")}
          </button>
          <button
            type="button"
            role="tab"
            className={tab === "anims" ? "is-on" : ""}
            aria-selected={tab === "anims"}
            onClick={() => setTab("anims")}
          >
            {t("lunmeyo.tabs.animations")}
          </button>
        </div>
      ) : null}
      {tab === "stickers" && enableLunmeyo ? (
        <LunmeyoPickerPanel type="png" onSelect={handleLunmeyoSelect} />
      ) : tab === "anims" && enableLunmeyo ? (
        <LunmeyoPickerPanel type="mp4" onSelect={handleLunmeyoSelect} />
      ) : emojiPickerMod?.default ? (
        (() => {
          const EmojiPickerPanel = emojiPickerMod.default;
          return (
            <EmojiPickerPanel
              onEmojiClick={handleEmojiClick}
              theme={pickerTheme}
              lazyLoadEmojis
              searchPlaceholder="Пошук…"
              previewConfig={{ showPreview: false }}
              width={pickerWidth}
              height={emojiHeight}
            />
          );
        })()
      ) : null}
    </div>
  );

  const portalContent =
    open && getPortalRoot()
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
                  ? {
                      zIndex: Z_INDEX_PICKER,
                      width: "100%",
                      height: coords.height,
                      maxHeight: coords.height,
                      bottom: coords.bottom,
                    }
                  : {
                      position: "fixed",
                      top: coords.top,
                      left: coords.left,
                      width: coords.width,
                      height: coords.height,
                      maxHeight: coords.height,
                      zIndex: Z_INDEX_PICKER,
                    }
              }
              role="dialog"
              aria-label="Вибір емодзі"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {pickerBody}
            </div>
          </>,
          getPortalRoot(),
        )
      : null;

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
      {portalContent}
    </div>
  );
}
