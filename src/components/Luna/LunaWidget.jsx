import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import EmojiPickerButton from "../EmojiPicker/EmojiPickerButton";
import { useImmersiveHidden } from "../../hooks/useImmersiveHidden";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useLunaStore } from "../../zustand/useLunaStore";
import {
  LUNA_APPEARANCE,
  lunaAvatarSrc,
  lunaGreetingSrc,
  lunaStickerSrc,
  lunaThinkSrc,
  normalizeLunaAppearance,
  prefersReducedMotion,
} from "../../utils/lunaAssets";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import "./LunaWidget.scss";

const FAB_HELLO_KEY = "lunmeyo.luna.fabHello";
const GREET_KEY = "lunmeyo.luna.chatHello";
const PAUSE_KEY = "lunmeyo.luna.pauseAnim";
const MOBILE_MQ = "(max-width: 768px)";

function useShowLunaFab() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthRoute =
    location.pathname.startsWith("/auth") || location.pathname === "/auth/callback";
  const hideRoute =
    isAuthRoute ||
    location.pathname.startsWith("/legal") ||
    location.pathname.startsWith("/features") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/live") ||
    location.pathname === "/earn" ||
    location.pathname === "/users/profile/complete" ||
    location.pathname === "/";
  return Boolean(isAuthed && user?.profileCompleted && !hideRoute);
}

function useChosenAppearance() {
  const storeAppearance = useLunaStore((s) => s.appearance);
  const userAppearance = useAuthStore((s) => s.user?.lunaAppearance);
  return storeAppearance || normalizeLunaAppearance(userAppearance);
}

function useLunaKeyboardInset(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const viewport = window.visualViewport;
    const sync = () => {
      const inset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      document.documentElement.style.setProperty(
        "--luna-keyboard",
        `${Math.round(inset)}px`,
      );
    };
    sync();
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      document.documentElement.style.removeProperty("--luna-keyboard");
    };
  }, [enabled]);
}

function LunaSticker({ appearance, stickerId, className }) {
  const src = lunaStickerSrc(appearance, stickerId);
  if (!src) return null;
  return <img className={className} src={src} alt="" />;
}

function LunaFab({ onOpen, appearance, hidden }) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches,
  );
  const [hello, setHello] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!userId || prefersReducedMotion()) return undefined;
    const key = `${FAB_HELLO_KEY}.${userId}`;
    try {
      if (sessionStorage.getItem(key)) return undefined;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setHello(true);
    const id = window.setTimeout(() => setHello(false), 1200);
    return () => window.clearTimeout(id);
  }, [userId]);

  return (
    <button
      type="button"
      className={`lunaFab${mobile ? " lunaFab--mobile" : " lunaFab--desktop"}${
        hidden ? " is-hidden" : ""
      }`}
      aria-label={t("luna.fabAria")}
      onClick={onOpen}
      hidden={hidden}
    >
      <img
        className={`lunaFab__avatar${hello ? " is-hello" : ""}`}
        src={lunaAvatarSrc(appearance)}
        alt=""
      />
      {!mobile ? <span>{t("luna.fabLabel")}</span> : null}
    </button>
  );
}

function LunaPicker({ onPicked }) {
  const { t } = useTranslation();
  const chooseAppearance = useLunaStore((s) => s.chooseAppearance);
  const loading = useLunaStore((s) => s.loading);
  const [picked, setPicked] = useState(LUNA_APPEARANCE.MOON);

  return (
    <div className="lunaPicker">
      <h2>{t("luna.pickerTitle")}</h2>
      <div className="lunaPicker__cards">
        {[
          { id: LUNA_APPEARANCE.MOON, title: "luna.moonTitle", hint: "luna.moonHint" },
          { id: LUNA_APPEARANCE.ROBOT, title: "luna.robotTitle", hint: "luna.robotHint" },
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            className={`lunaPicker__card${picked === card.id ? " is-on" : ""}`}
            onClick={() => setPicked(card.id)}
          >
            <img src={lunaAvatarSrc(card.id)} alt="" />
            <strong>{t(card.title)}</strong>
            <p>{t(card.hint)}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="lunaPicker__start"
        disabled={loading}
        onClick={async () => {
          await chooseAppearance(picked);
          onPicked?.();
        }}
      >
        {t("luna.pickerStart")}
      </button>
    </div>
  );
}

function LunaThread({ paused }) {
  const { t } = useTranslation();
  const appearance = useChosenAppearance();
  const messages = useLunaStore((s) => s.messages);
  const sending = useLunaStore((s) => s.sending);
  const error = useLunaStore((s) => s.error);
  const send = useLunaStore((s) => s.send);
  const retry = useLunaStore((s) => s.retry);
  const greetingPlayed = useLunaStore((s) => s.greetingPlayed);
  const markGreetingPlayed = useLunaStore((s) => s.markGreetingPlayed);
  const userId = useAuthStore((s) => s.user?.id);
  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);
  const [text, setText] = useState("");
  const reduce = prefersReducedMotion() || paused;

  const showIntro = messages.length === 0;
  const greetOnce = useMemo(() => {
    if (!userId) return false;
    try {
      return sessionStorage.getItem(`${GREET_KEY}.${userId}`) !== "1";
    } catch {
      return !greetingPlayed;
    }
  }, [userId, greetingPlayed]);

  useEffect(() => {
    if (!showIntro || !greetOnce || reduce) return undefined;
    try {
      sessionStorage.setItem(`${GREET_KEY}.${userId}`, "1");
    } catch {
      /* ignore */
    }
    markGreetingPlayed();
    return undefined;
  }, [showIntro, greetOnce, reduce, userId, markGreetingPlayed]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages, sending]);

  const prompts = [
    ["site", t("luna.promptMessages.site")],
    ["caption", t("luna.promptMessages.caption")],
    ["translate", t("luna.promptMessages.translate")],
    ["chat", t("luna.promptMessages.chat")],
  ];

  const greetingSrc = !reduce && greetOnce ? lunaGreetingSrc(appearance) : null;
  const thinkSrc = !reduce ? lunaThinkSrc(appearance) : null;

  const submit = () => {
    const next = text;
    setText("");
    void send(next);
  };

  return (
    <>
      <div className="lunaMessages" ref={scrollerRef}>
        {showIntro ? (
          <div className="lunaEmpty">
            {greetingSrc ? (
              <img className="lunaGreet" src={greetingSrc} alt="" />
            ) : (
              <img
                className={greetOnce && !reduce ? "lunaGreet" : undefined}
                src={lunaAvatarSrc(appearance)}
                width="72"
                height="72"
                alt=""
              />
            )}
            <p>{t("luna.emptyHello")}</p>
            <div className="lunaPrompts">
              {prompts.map(([id, message]) => (
                <button key={id} type="button" onClick={() => void send(message)}>
                  {t(`luna.prompts.${id}`)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`lunaTurn lunaTurn--${msg.role}${msg.failed ? " is-failed" : ""}`}
            >
              {msg.role === "assistant" ? (
                <LunaSticker
                  appearance={msg.appearance || appearance}
                  stickerId={msg.stickerId}
                  className="lunaSticker"
                />
              ) : null}
              {msg.text ? (
                <div
                  className={`lunaBubble lunaBubble--${msg.role}${
                    msg.failed ? " is-failed" : ""
                  }`}
                >
                  {msg.text}
                </div>
              ) : null}
              {msg.failed ? (
                <button type="button" className="lunaRetry" onClick={() => void retry()}>
                  {t("luna.retry")}
                </button>
              ) : null}
            </div>
          ))
        )}
        {sending ? (
          <div className="lunaTurn lunaTurn--assistant lunaThinking">
            {thinkSrc ? <img className="lunaSticker" src={thinkSrc} alt="" /> : null}
            <p className="lunaBubble lunaBubble--assistant">{t("luna.thinking")}</p>
          </div>
        ) : null}
        {error ? (
          <button type="button" className="lunaRetry" onClick={() => void retry()}>
            {getApiErrorMessage(error, t) || t("luna.error")}
          </button>
        ) : null}
      </div>
      <form
        className="lunaComposer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <EmojiPickerButton
          inputRef={textareaRef}
          value={text}
          onChange={setText}
          layout="messenger"
          ariaLabel={t("posts.create.addEmoji")}
        />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={t("luna.placeholder")}
          rows={1}
          maxLength={2000}
        />
        <button className="lunaComposer__send" type="submit" disabled={sending || !text.trim()}>
          {t("luna.send")}
        </button>
      </form>
    </>
  );
}

function LunaPanel({ onClose }) {
  const { t } = useTranslation();
  const appearance = useChosenAppearance();
  const demo = useLunaStore((s) => s.demo);
  const loading = useLunaStore((s) => s.loading);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [paused, setPaused] = useState(() => {
    try {
      return sessionStorage.getItem(PAUSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useLunaKeyboardInset(true);

  const reduce = prefersReducedMotion() || paused;
  const showPause = !reduce;

  return (
    <div className="lunaOverlay" onClick={onClose} role="presentation">
      <aside
        className={`lunaPanel${paused ? " is-paused" : ""}`}
        role="dialog"
        aria-label={t("luna.name")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="lunaPanel__head">
          <img className="lunaPanel__headAvatar" src={lunaAvatarSrc(appearance)} alt="" />
          <div className="lunaPanel__titles">
            <span className="lunaPanel__name">{t("luna.name")}</span>
            <span className="lunaPanel__sub">{t("luna.subtitle")}</span>
          </div>
          {appearance ? (
            <div className="lunaPanel__menuWrap">
              <button
                type="button"
                className="lunaPanel__menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ···
              </button>
              {menuOpen ? (
                <div className="lunaPanel__menuList" role="menu">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setChanging(true);
                    }}
                  >
                    {t("luna.changeLook")}
                  </button>
                  {showPause ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaused(true);
                        setMenuOpen(false);
                        try {
                          sessionStorage.setItem(PAUSE_KEY, "1");
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {t("luna.pauseAnimation")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <button type="button" className="lunaPanel__iconBtn" onClick={onClose} aria-label={t("luna.close")}>
            ×
          </button>
        </header>
        {demo ? <p className="lunaDemo">{t("luna.demoBanner")}</p> : null}
        {loading && !appearance ? <p className="lunaEmpty">{t("common.loading")}</p> : null}
        {!appearance || changing ? (
          <LunaPicker onPicked={() => setChanging(false)} />
        ) : (
          <LunaThread paused={paused} />
        )}
      </aside>
    </div>
  );
}

export default function LunaWidget() {
  const showFab = useShowLunaFab();
  const immersiveHidden = useImmersiveHidden();
  const isOpen = useLunaStore((s) => s.isOpen);
  const appearance = useChosenAppearance();
  const open = useLunaStore((s) => s.open);
  const close = useLunaStore((s) => s.close);
  const load = useLunaStore((s) => s.load);

  const onOpen = useCallback(() => {
    open();
  }, [open]);

  useEffect(() => {
    if (showFab) void load();
  }, [showFab, load]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!showFab) return null;

  return (
    <>
      {createPortal(
        <LunaFab onOpen={onOpen} appearance={appearance} hidden={immersiveHidden || isOpen} />,
        document.body,
      )}
      {isOpen ? createPortal(<LunaPanel onClose={close} />, document.body) : null}
    </>
  );
}
