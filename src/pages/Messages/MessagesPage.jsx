import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MESSAGE_CREATED_EVENT,
  MESSAGE_READ_EVENT,
} from "../../constants/messageEvents";
import { conversationsApi } from "../../services/conversationsApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import MessageSoundToggle from "../../components/Messages/MessageSoundToggle";
import MessagesNavBadge from "../../components/Messages/MessagesNavBadge";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useMessagesStore } from "../../zustand/useMessagesStore";
import "./MessagesPage.scss";

function getDisplayName(user, fallback) {
  if (!user) return fallback;
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.username || fallback;
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function sortConversations(items) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function upsertConversationFromMessage(prev, envelope) {
  const conversationId = envelope?.conversationId;
  const message = envelope?.message;
  if (!conversationId || !message?.id) return prev;

  const index = prev.findIndex((c) => String(c.id) === String(conversationId));
  if (index < 0) return prev;

  const current = prev[index];
  const updated = {
    ...current,
    lastMessage: message,
    updatedAt: message.createdAt || current.updatedAt,
    unreadCount:
      typeof envelope.unreadCount === "number"
        ? envelope.unreadCount
        : (current.unreadCount || 0) + 1,
  };

  const rest = prev.filter((_, i) => i !== index);
  return sortConversations([updated, ...rest]);
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const setActiveConversationId = useMessagesStore((s) => s.setActiveConversationId);
  const setTotalUnreadCount = useMessagesStore((s) => s.setTotalUnreadCount);
  const applyConversationRead = useMessagesStore((s) => s.applyConversationRead);
  const fetchTotalUnreadCount = useMessagesStore((s) => s.fetchTotalUnreadCount);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [listError, setListError] = useState("");

  const messagesEndRef = useRef(null);
  const activeConversationId = conversationId || null;

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  useEffect(() => {
    setActiveConversationId(activeConversationId);
    return () => setActiveConversationId(null);
  }, [activeConversationId, setActiveConversationId]);

  useEffect(() => {
    if (!isAuthed) {
      navigate("/auth/login", {
        replace: true,
        state: {
          redirectTo: activeConversationId
            ? `/messages/${activeConversationId}`
            : "/messages",
        },
      });
    }
  }, [isAuthed, navigate, activeConversationId]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      setListError("");
      const items = await conversationsApi.list();
      setConversations(sortConversations(Array.isArray(items) ? items : []));
    } catch (err) {
      console.error("[messages] list failed", err);
      setListError(getApiErrorMessage(err, "messenger.loadChatsError"));
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const markChatRead = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const result = await conversationsApi.markConversationRead(id);
        if (typeof result?.totalUnreadCount === "number") {
          setTotalUnreadCount(result.totalUnreadCount);
        }
        applyConversationRead(result);
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(id) ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch (err) {
        console.error("[messages] mark read failed", err);
      }
    },
    [setTotalUnreadCount, applyConversationRead],
  );

  const loadMessages = useCallback(
    async (id) => {
      if (!id) {
        setMessages([]);
        return;
      }
      try {
        setLoadingChat(true);
        const result = await conversationsApi.getMessages(id, { limit: 100 });
        setMessages(result.items || []);
        if (typeof result.totalUnreadCount === "number") {
          setTotalUnreadCount(result.totalUnreadCount);
        }
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(id) ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch (err) {
        console.error("[messages] chat failed", err);
        toast.error(getApiErrorMessage(err, "messenger.loadMessagesError"));
        setMessages([]);
      } finally {
        setLoadingChat(false);
      }
    },
    [setTotalUnreadCount],
  );

  useEffect(() => {
    if (!isAuthed) return;
    loadConversations();
    fetchTotalUnreadCount();
  }, [isAuthed, loadConversations, fetchTotalUnreadCount]);

  useEffect(() => {
    if (!isAuthed || !activeConversationId) return;
    loadMessages(activeConversationId);
    void markChatRead(activeConversationId);
  }, [isAuthed, activeConversationId, loadMessages, markChatRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversationId]);

  useEffect(() => {
    const onCreated = (event) => {
      const envelope = event?.detail;
      const message = envelope?.message;
      const convId = envelope?.conversationId;
      if (!message?.id || !convId) return;

      setConversations((prev) => {
        const next = upsertConversationFromMessage(prev, envelope);
        if (next === prev) {
          void loadConversations();
        }
        return next;
      });

      if (
        activeConversationId &&
        String(convId) === String(activeConversationId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(message.id))) {
            return prev;
          }
          return [...prev, message];
        });
        void markChatRead(convId);
      }
    };

    const onRead = (event) => {
      const envelope = event?.detail;
      const convId = envelope?.conversationId;
      if (!convId) return;

      if (typeof envelope.totalUnreadCount === "number") {
        setTotalUnreadCount(envelope.totalUnreadCount);
      }

      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(convId) ? { ...c, unreadCount: 0 } : c,
        ),
      );
    };

    window.addEventListener(MESSAGE_CREATED_EVENT, onCreated);
    window.addEventListener(MESSAGE_READ_EVENT, onRead);
    return () => {
      window.removeEventListener(MESSAGE_CREATED_EVENT, onCreated);
      window.removeEventListener(MESSAGE_READ_EVENT, onRead);
    };
  }, [activeConversationId, markChatRead, setTotalUnreadCount, loadConversations]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId || sending) return;

    try {
      setSending(true);
      const created = await conversationsApi.sendMessage(activeConversationId, text);
      setDraft("");
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(created.id))) return prev;
        return [...prev, created];
      });
      setConversations((prev) =>
        sortConversations(
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, lastMessage: created, updatedAt: created.createdAt }
              : c,
          ),
        ),
      );
    } catch (err) {
      console.error("[messages] send failed", err);
      toast.error(getApiErrorMessage(err, "messenger.sendError"));
    } finally {
      setSending(false);
    }
  };

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="messagesPage">
      <div className="messagesPage__layout">
        <aside className="messagesPage__sidebar">
          <div className="messagesPage__sidebarHead">
            <h1 className="messagesPage__title">
              {t("messenger.title")}
              <MessagesNavBadge className="messagesPage__titleBadge" />
            </h1>
            <MessageSoundToggle />
          </div>

          {loadingList && <p className="messagesPage__hint">{t("common.loading")}</p>}
          {!loadingList && listError && (
            <p className="messagesPage__hint messagesPage__hint--error">{listError}</p>
          )}
          {!loadingList && !listError && conversations.length === 0 && (
            <p className="messagesPage__hint">{t("messenger.noChats")}</p>
          )}

          <ul className="messagesPage__chatList">
            {conversations.map((chat) => {
              const isActive = chat.id === activeConversationId;
              const name = getDisplayName(chat.participant, t("common.user"));
              const preview = chat.lastMessage?.text || t("messenger.noMessages");
              return (
                <li key={chat.id}>
                  <Link
                    to={`/messages/${chat.id}`}
                    className={`messagesPage__chatItem${isActive ? " is-active" : ""}`}
                  >
                    <div className="messagesPage__chatAvatar">
                      {chat.participant?.avatarUrl ? (
                        <img src={chat.participant.avatarUrl} alt="" />
                      ) : (
                        <span>{name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="messagesPage__chatMeta">
                      <div className="messagesPage__chatTop">
                        <span className="messagesPage__chatName">{name}</span>
                        {chat.unreadCount > 0 && (
                          <span className="messagesPage__unread">{chat.unreadCount}</span>
                        )}
                      </div>
                      <p className="messagesPage__chatPreview">{preview}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="messagesPage__chat">
          {!activeConversationId && (
            <div className="messagesPage__emptyChat">
              <p>{t("messenger.selectChat")}</p>
            </div>
          )}

          {activeConversationId && (
            <>
              <header className="messagesPage__chatHead">
                <h2 className="messagesPage__chatTitle">
                  {getDisplayName(activeConversation?.participant, t("common.user"))}
                </h2>
              </header>

              <div className="messagesPage__messages">
                {loadingChat && <p className="messagesPage__hint">{t("common.loading")}</p>}
                {!loadingChat &&
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`messagesPage__bubble${isMine ? " is-mine" : " is-theirs"}`}
                      >
                        <p className="messagesPage__bubbleText">{msg.text}</p>
                        <time className="messagesPage__bubbleTime">{formatTime(msg.createdAt)}</time>
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              <form className="messagesPage__composer" onSubmit={handleSend}>
                <input
                  className="messagesPage__input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("messenger.placeholder")}
                  maxLength={4000}
                  disabled={sending}
                />
                <button type="submit" className="messagesPage__sendBtn" disabled={sending || !draft.trim()}>
                  {sending ? "..." : t("common.send")}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
