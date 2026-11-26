import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  LuHistory,
  LuMessageSquarePlus,
  LuMic,
  LuPalette,
  LuPaperclip,
  LuPause,
  LuPlus,
  LuSearch,
  LuSend,
  LuSquare,
  LuTrash2,
  LuX,
} from "react-icons/lu";
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
import {
  getApiErrorMessage,
  isLunaRetryAllowed,
} from "../../utils/getApiErrorMessage";
import { lunaMarkdownToHtml } from "../../utils/lunaMarkdown";
import { lunaApi } from "../../services/lunaApi";
import {
  bindLunaTabSync,
  conversationDisplayTitle,
} from "../../utils/lunaConversations";
import { placeLunaMenu } from "../../utils/lunaMenu";
import "./LunaWidget.scss";

const FAB_HELLO_KEY = "lunmeyo.luna.fabHello";
const GREET_KEY = "lunmeyo.luna.chatHello";
const PAUSE_KEY = "lunmeyo.luna.pauseAnim";
const MOBILE_MQ = "(max-width: 768px)";
const LUNA_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const LUNA_MAX_AUDIO_MS = 60_000;
const LUNA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const LUNA_TEXTAREA_MAX_PX = 132;
const LUNA_STICK_THRESHOLD_PX = 80;

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

function LunaMessageBody({ msg }) {
  const html = lunaMarkdownToHtml(msg.text || "");
  if (!msg.imageUrl && !html) return null;
  return (
    <div
      className={`lunaBubble lunaBubble--${msg.role}${msg.failed ? " is-failed" : ""}`}
    >
      {msg.imageUrl ? (
        <img className="lunaBubble__photo" src={msg.imageUrl} alt="" />
      ) : null}
      {html ? (
        <div
          className="lunaBubble__md"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </div>
  );
}

function LunaThread({ paused }) {
  const { t } = useTranslation();
  const appearance = useChosenAppearance();
  const messages = useLunaStore((s) => s.messages);
  const sending = useLunaStore((s) => s.sending);
  const error = useLunaStore((s) => s.error);
  const errorMeta = useLunaStore((s) => s.errorMeta);
  const send = useLunaStore((s) => s.send);
  const retry = useLunaStore((s) => s.retry);
  const greetingPlayed = useLunaStore((s) => s.greetingPlayed);
  const markGreetingPlayed = useLunaStore((s) => s.markGreetingPlayed);
  const setDraft = useLunaStore((s) => s.setDraft);
  const draftEpoch = useLunaStore((s) => s.draftEpoch);
  const highlightMessageId = useLunaStore((s) => s.highlightMessageId);
  const userId = useAuthStore((s) => s.user?.id);
  const scrollerRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef(null);
  const photoRef = useRef(null);
  const moreRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const recordMsRef = useRef(0);
  const cancelledRef = useRef(false);
  const [transcribing, setTranscribing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches,
  );
  const reduce = prefersReducedMotion() || paused;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => {
      setMobile(mq.matches);
      if (!mq.matches) setMoreOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onPointer = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moreRef.current?.contains(target)) return;
      if (document.getElementById("emoji-picker-portal-root")?.contains(target)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [moreOpen]);

  const growField = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, LUNA_TEXTAREA_MAX_PX)}px`;
  }, []);

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
    const el = scrollerRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    setText("");
    setPhoto(null);
    setPhotoUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return "";
    });
    setDraft("", false);
  }, [draftEpoch, setDraft]);

  useEffect(() => {
    setDraft(text, Boolean(photo));
  }, [text, photo, setDraft]);

  useEffect(() => {
    if (!highlightMessageId || !scrollerRef.current) return;
    const el = scrollerRef.current.querySelector(
      `[data-luna-msg="${highlightMessageId}"]`,
    );
    el?.scrollIntoView({ block: "center" });
  }, [highlightMessageId, messages]);

  const prompts = [
    ["site", t("luna.promptMessages.site")],
    ["caption", t("luna.promptMessages.caption")],
    ["translate", t("luna.promptMessages.translate")],
    ["chat", t("luna.promptMessages.chat")],
  ];

  const greetingSrc = !reduce && greetOnce ? lunaGreetingSrc(appearance) : null;
  const thinkSrc = !reduce ? lunaThinkSrc(appearance) : null;

  const clearPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl("");
    if (photoRef.current) photoRef.current.value = "";
  };

  const stopRecorder = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recorderRef.current = null;
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecording(false);
  };

  const submit = () => {
    const next = text;
    const file = photo;
    if (!next.trim() && !file) return;
    stickToBottomRef.current = true;
    setMoreOpen(false);
    setText("");
    clearPhoto();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    void send(next, file);
  };

  const onPickPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!LUNA_IMAGE_TYPES.includes(file.type) || file.size > LUNA_MAX_IMAGE_BYTES) {
      useLunaStore.setState({ error: { response: { data: { code: "LUNA_IMAGE_INVALID" } } } });
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const startRecording = async () => {
    if (recording || transcribing || sending) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      useLunaStore.setState({ error: { response: { data: { code: "LUNA_AUDIO_INVALID" } } } });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelledRef.current) {
          cancelledRef.current = false;
          chunksRef.current = [];
          setRecordMs(0);
          recordMsRef.current = 0;
          return;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const seconds = Math.max(1, Math.round(recordMsRef.current / 1000) || 1);
        if (!blob.size) return;
        setTranscribing(true);
        try {
          const file = new File([blob], `luna-voice.${blob.type.includes("ogg") ? "ogg" : "webm"}`, {
            type: blob.type || "audio/webm",
          });
          const result = await lunaApi.transcribe({
            audioFile: file,
            durationSeconds: Math.min(60, seconds),
          });
          if (result?.text) {
            setText((prev) => (prev ? `${prev} ${result.text}` : result.text));
            requestAnimationFrame(() => growField(textareaRef.current));
          }
        } catch (error) {
          useLunaStore.setState({ error });
        } finally {
          setTranscribing(false);
          setRecordMs(0);
        }
      };
      cancelledRef.current = false;
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      recordMsRef.current = 0;
      setRecordMs(0);
      const started = Date.now();
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - started;
        recordMsRef.current = elapsed;
        setRecordMs(elapsed);
        if (elapsed >= LUNA_MAX_AUDIO_MS) stopRecorder();
      }, 200);
    } catch {
      useLunaStore.setState({ error: { response: { data: { code: "LUNA_AUDIO_INVALID" } } } });
    }
  };

  const toolsBusy = sending || recording || transcribing;
  const attachButton = (
    <button
      type="button"
      className="lunaComposer__icon"
      aria-label={t("luna.attachPhoto")}
      disabled={toolsBusy}
      onClick={() => {
        setMoreOpen(false);
        photoRef.current?.click();
      }}
    >
      <LuPaperclip size={20} />
    </button>
  );
  const micButton = (
    <button
      type="button"
      className={`lunaComposer__icon${recording ? " is-on" : ""}`}
      aria-label={t("luna.recordVoice")}
      disabled={sending || transcribing}
      onClick={() => {
        setMoreOpen(false);
        if (recording) stopRecorder();
        else void startRecording();
      }}
    >
      <LuMic size={20} />
    </button>
  );
  const emojiButton = (
    <EmojiPickerButton
      className={`lunaComposer__emoji${toolsBusy ? " is-disabled" : ""}`}
      inputRef={textareaRef}
      value={text}
      onChange={(value) => {
        setText(value);
        requestAnimationFrame(() => growField(textareaRef.current));
      }}
      enableLunmeyo={false}
      ariaLabel={t("posts.create.addEmoji")}
    />
  );

  return (
    <>
      <div
        className="lunaMessages"
        ref={scrollerRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < LUNA_STICK_THRESHOLD_PX;
        }}
      >
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
              data-luna-msg={msg.id}
              className={`lunaTurn lunaTurn--${msg.role}${msg.failed ? " is-failed" : ""}${
                highlightMessageId === msg.id ? " is-highlight" : ""
              }`}
            >
              {msg.role === "assistant" ? (
                <LunaSticker
                  appearance={msg.appearance || appearance}
                  stickerId={msg.stickerId}
                  className="lunaSticker"
                />
              ) : null}
              <LunaMessageBody msg={msg} />
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
          <div className="lunaSystemError" role="alert" aria-live="polite">
            <p className="lunaBubble lunaBubble--system">
              {getApiErrorMessage(error, "luna.error")}
              {errorMeta?.quotaRestored ? (
                <span className="lunaSystemError__note">{t("luna.quotaRestored")}</span>
              ) : null}
            </p>
            {isLunaRetryAllowed(error) ? (
              <button
                type="button"
                className="lunaRetry"
                disabled={sending}
                onClick={() => void retry()}
              >
                {t("luna.retry")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {photoUrl ? (
        <div className="lunaPreview">
          <img src={photoUrl} alt="" />
          <button type="button" onClick={clearPhoto} aria-label={t("luna.removePhoto")}>
            <LuX size={18} />
          </button>
        </div>
      ) : null}
      {recording || transcribing ? (
        <div className="lunaRecordBar" aria-live="polite">
          {transcribing ? (
            <span>{t("luna.transcribing")}</span>
          ) : (
            <>
              <span className="lunaRecordBar__dot" />
              <span>
                {t("luna.recording")} {Math.floor(recordMs / 1000)}s
              </span>
              <button type="button" onClick={stopRecorder}>
                <LuSquare size={14} /> {t("luna.stopRecording")}
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelledRef.current = true;
                  chunksRef.current = [];
                  stopRecorder();
                }}
              >
                {t("luna.cancelRecording")}
              </button>
            </>
          )}
        </div>
      ) : null}
      <form
        className={`lunaComposer${mobile ? " lunaComposer--mobile" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={onPickPhoto}
        />
        {mobile ? (
          <div className="lunaComposer__more" ref={moreRef}>
            <button
              type="button"
              className={`lunaComposer__icon${moreOpen ? " is-open" : ""}`}
              aria-label={t("luna.moreActions")}
              aria-expanded={moreOpen}
              disabled={toolsBusy}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <LuPlus size={22} />
            </button>
            <div className={`lunaComposer__moreMenu${moreOpen ? " is-open" : ""}`}>
              {attachButton}
              {emojiButton}
            </div>
          </div>
        ) : (
          <>
            {attachButton}
            {micButton}
            {emojiButton}
          </>
        )}
        <div className="lunaComposer__field">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              growField(event.target);
            }}
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
        </div>
        {mobile ? micButton : null}
        <button
          className="lunaComposer__send"
          type="submit"
          disabled={sending || transcribing || recording || (!text.trim() && !photo)}
          aria-label={t("luna.send")}
        >
          <LuSend size={18} />
        </button>
      </form>
    </>
  );
}

function LunaConfirm({ confirm, busy, onCancel, onConfirm }) {
  const { t } = useTranslation();
  if (!confirm) return null;
  const copy = {
    clear: {
      title: t("luna.clearChatTitle"),
      body: t("luna.clearChatBody"),
      action: t("luna.clearChatConfirm"),
    },
    delete: {
      title: t("luna.deleteChatTitle"),
      body: t("luna.deleteChatBody"),
      action: t("luna.deleteChatConfirm"),
    },
    newChat: {
      title: t("luna.newChatDraftTitle"),
      body: t("luna.newChatDraftBody"),
      action: t("luna.newChatConfirm"),
    },
  }[confirm.kind];
  if (!copy) return null;
  return (
    <div className="lunaConfirm" role="presentation" onClick={onCancel}>
      <div
        className="lunaConfirm__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="luna-confirm-title"
        aria-describedby="luna-confirm-body"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="luna-confirm-title" className="lunaConfirm__title">
          {copy.title}
        </p>
        <p id="luna-confirm-body" className="lunaConfirm__body">
          {copy.body}
        </p>
        <div className="lunaConfirm__actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            {t("luna.cancel")}
          </button>
          <button
            type="button"
            className="lunaConfirm__danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t("luna.confirming") : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}

function LunaHistorySheet() {
  const { t } = useTranslation();
  const conversations = useLunaStore((s) => s.conversations);
  const conversationId = useLunaStore((s) => s.conversationId);
  const openConversation = useLunaStore((s) => s.openConversation);
  const requestDelete = useLunaStore((s) => s.requestDelete);
  const setSheet = useLunaStore((s) => s.setSheet);
  const untitled = t("luna.untitled");

  return (
    <div className="lunaSheet" role="dialog" aria-label={t("luna.history")}>
      <div className="lunaSheet__head">
        <strong>{t("luna.history")}</strong>
        <button type="button" onClick={() => setSheet(null)} aria-label={t("luna.close")}>
          <LuX size={18} />
        </button>
      </div>
      {conversations.length === 0 ? (
        <p className="lunaSheet__empty">{t("luna.historyEmpty")}</p>
      ) : (
        <ul className="lunaSheet__list">
          {conversations.map((item) => (
            <li
              key={item.id}
              className={item.id === conversationId ? "is-active" : undefined}
            >
              <button
                type="button"
                className="lunaSheet__item"
                onClick={() => void openConversation(item.id)}
              >
                <span>{conversationDisplayTitle(item, untitled)}</span>
                <small>
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleString()
                    : ""}
                </small>
              </button>
              <button
                type="button"
                className="lunaSheet__delete"
                aria-label={t("luna.deleteChat")}
                onClick={() => requestDelete(item.id)}
              >
                <LuTrash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LunaSearchSheet() {
  const { t } = useTranslation();
  const searchQuery = useLunaStore((s) => s.searchQuery);
  const searchResults = useLunaStore((s) => s.searchResults);
  const searching = useLunaStore((s) => s.searching);
  const search = useLunaStore((s) => s.search);
  const jumpToMessage = useLunaStore((s) => s.jumpToMessage);
  const setSheet = useLunaStore((s) => s.setSheet);

  return (
    <div className="lunaSheet" role="dialog" aria-label={t("luna.search")}>
      <div className="lunaSheet__head">
        <strong>
          <LuSearch size={16} /> {t("luna.search")}
        </strong>
        <button type="button" onClick={() => setSheet(null)} aria-label={t("luna.close")}>
          <LuX size={18} />
        </button>
      </div>
      <input
        className="lunaSheet__search"
        value={searchQuery}
        onChange={(event) => void search(event.target.value)}
        placeholder={t("luna.searchPlaceholder")}
        autoFocus
      />
      {searching ? <p className="lunaSheet__empty">{t("common.loading")}</p> : null}
      {!searching && searchQuery.trim() && searchResults.length === 0 ? (
        <p className="lunaSheet__empty">{t("luna.searchEmpty")}</p>
      ) : null}
      <ul className="lunaSheet__list">
        {searchResults.map((msg) => (
          <li key={msg.id}>
            <button
              type="button"
              className="lunaSheet__item"
              onClick={() => jumpToMessage(msg.id)}
            >
              <span>{msg.text || t("luna.attachPhoto")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LunaPanel({ onClose }) {
  const { t } = useTranslation();
  const appearance = useChosenAppearance();
  const demo = useLunaStore((s) => s.demo);
  const loading = useLunaStore((s) => s.loading);
  const mutating = useLunaStore((s) => s.mutating);
  const supportsConversations = useLunaStore((s) => s.supportsConversations);
  const sheet = useLunaStore((s) => s.sheet);
  const confirm = useLunaStore((s) => s.confirm);
  const setSheet = useLunaStore((s) => s.setSheet);
  const requestNewChat = useLunaStore((s) => s.requestNewChat);
  const requestClear = useLunaStore((s) => s.requestClear);
  const cancelConfirm = useLunaStore((s) => s.cancelConfirm);
  const createConversation = useLunaStore((s) => s.createConversation);
  const clearConversation = useLunaStore((s) => s.clearConversation);
  const deleteConversation = useLunaStore((s) => s.deleteConversation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [changing, setChanging] = useState(false);
  const menuBtnRef = useRef(null);
  const menuRef = useRef(null);
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

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const positionMenu = useCallback(() => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = menuRef.current?.offsetHeight || 280;
    setMenuPos(
      placeLunaMenu(rect, {
        width: window.innerWidth,
        height: window.innerHeight,
      }, { height }),
    );
  }, []);

  const toggleMenu = () => setMenuOpen((open) => !open);

  useEffect(() => {
    if (!menuOpen) return undefined;
    positionMenu();
    const onPointer = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuBtnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMenu();
        menuBtnRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
        return;
      }
      const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      let next = 0;
      if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
      if (event.key === "ArrowUp") next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
      if (event.key === "End") next = items.length - 1;
      items[next]?.focus();
    };
    const onReposition = () => positionMenu();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus();
      positionMenu();
    });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [menuOpen, closeMenu, positionMenu]);

  const runMenuAction = (action) => {
    closeMenu();
    action();
  };

  const menu = menuOpen
    ? createPortal(
        <div
          id="luna-menu-portal"
          ref={menuRef}
          className="lunaMenu"
          role="menu"
          aria-label={t("luna.moreActions")}
          style={
            menuPos
              ? {
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                  width: menuPos.width,
                  maxHeight: menuPos.maxHeight,
                  zIndex: 11050,
                }
              : { position: "fixed", visibility: "hidden" }
          }
        >
          {supportsConversations ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="lunaMenu__item"
                onClick={() => runMenuAction(requestNewChat)}
              >
                <LuMessageSquarePlus size={18} className="lunaMenu__icon" aria-hidden="true" />
                <span className="lunaMenu__label">{t("luna.newChat")}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="lunaMenu__item"
                onClick={() => runMenuAction(() => setSheet("history"))}
              >
                <LuHistory size={18} className="lunaMenu__icon" aria-hidden="true" />
                <span className="lunaMenu__label">{t("luna.history")}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="lunaMenu__item"
                onClick={() => runMenuAction(() => setSheet("search"))}
              >
                <LuSearch size={18} className="lunaMenu__icon" aria-hidden="true" />
                <span className="lunaMenu__label">{t("luna.search")}</span>
              </button>
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="lunaMenu__item"
            onClick={() => runMenuAction(() => setChanging(true))}
          >
            <LuPalette size={18} className="lunaMenu__icon" aria-hidden="true" />
            <span className="lunaMenu__label">{t("luna.changeLook")}</span>
          </button>
          {showPause ? (
            <button
              type="button"
              role="menuitem"
              className="lunaMenu__item"
              onClick={() =>
                runMenuAction(() => {
                  setPaused(true);
                  try {
                    sessionStorage.setItem(PAUSE_KEY, "1");
                  } catch {
                    /* ignore */
                  }
                })
              }
            >
              <LuPause size={18} className="lunaMenu__icon" aria-hidden="true" />
              <span className="lunaMenu__label">{t("luna.pauseAnimation")}</span>
            </button>
          ) : null}
          {supportsConversations ? (
            <>
              <div className="lunaMenu__sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="lunaMenu__item lunaMenu__item--danger"
                onClick={() => runMenuAction(requestClear)}
              >
                <LuTrash2 size={18} className="lunaMenu__icon" aria-hidden="true" />
                <span className="lunaMenu__label">{t("luna.clearChat")}</span>
              </button>
            </>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  const onConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === "clear") void clearConversation();
    else if (confirm.kind === "delete") void deleteConversation(confirm.conversationId);
    else if (confirm.kind === "newChat") void createConversation();
  };

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
                ref={menuBtnRef}
                type="button"
                className="lunaPanel__menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="luna-menu-portal"
                onClick={toggleMenu}
              >
                ···
              </button>
              {menu}
            </div>
          ) : null}
          <button type="button" className="lunaPanel__iconBtn" onClick={onClose} aria-label={t("luna.close")}>
            <LuX size={22} />
          </button>
        </header>
        {demo ? <p className="lunaDemo">{t("luna.demoBanner")}</p> : null}
        {loading && !appearance ? <p className="lunaEmpty">{t("common.loading")}</p> : null}
        {!appearance || changing ? (
          <LunaPicker onPicked={() => setChanging(false)} />
        ) : (
          <LunaThread paused={paused} />
        )}
        {sheet === "history" ? <LunaHistorySheet /> : null}
        {sheet === "search" ? <LunaSearchSheet /> : null}
        <LunaConfirm
          confirm={confirm}
          busy={mutating}
          onCancel={cancelConfirm}
          onConfirm={onConfirm}
        />
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

  useEffect(() => bindLunaTabSync(() => useLunaStore.getState()), []);

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
