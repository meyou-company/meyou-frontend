import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { conversationsApi } from "../../services/conversationsApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useNotificationsStore } from "../../zustand/useNotificationsStore";
import "./MessagesPage.scss";

function getDisplayName(user) {
  if (!user) return "Пользователь";
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.username || "Пользователь";
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

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);

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
    if (!isAuthed) {
      navigate("/auth/login", {
        replace: true,
        state: { redirectTo: activeConversationId ? `/messages/${activeConversationId}` : "/messages" },
      });
    }
  }, [isAuthed, navigate, activeConversationId]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      setListError("");
      const items = await conversationsApi.list();
      setConversations(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("[messages] list failed", err);
      setListError(getApiErrorMessage(err) || "Не удалось загрузить чаты");
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) {
      setMessages([]);
      return;
    }
    try {
      setLoadingChat(true);
      const result = await conversationsApi.getMessages(id, { limit: 100 });
      setMessages(result.items || []);
      fetchUnreadCount();
    } catch (err) {
      console.error("[messages] chat failed", err);
      toast.error(getApiErrorMessage(err) || "Не удалось загрузить сообщения");
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!isAuthed) return;
    loadConversations();
  }, [isAuthed, loadConversations]);

  useEffect(() => {
    if (!isAuthed || !activeConversationId) return;
    loadMessages(activeConversationId);
  }, [isAuthed, activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversationId]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId || sending) return;

    try {
      setSending(true);
      const created = await conversationsApi.sendMessage(activeConversationId, text);
      setDraft("");
      setMessages((prev) => [...prev, created]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: created, updatedAt: created.createdAt }
            : c,
        ),
      );
      await loadConversations();
    } catch (err) {
      console.error("[messages] send failed", err);
      toast.error(getApiErrorMessage(err) || "Не удалось отправить сообщение");
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
            <h1 className="messagesPage__title">Сообщения</h1>
          </div>

          {loadingList && <p className="messagesPage__hint">Загрузка...</p>}
          {!loadingList && listError && (
            <p className="messagesPage__hint messagesPage__hint--error">{listError}</p>
          )}
          {!loadingList && !listError && conversations.length === 0 && (
            <p className="messagesPage__hint">Чатов пока нет</p>
          )}

          <ul className="messagesPage__chatList">
            {conversations.map((chat) => {
              const isActive = chat.id === activeConversationId;
              const name = getDisplayName(chat.participant);
              const preview = chat.lastMessage?.text || "Нет сообщений";
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
              <p>Выберите чат слева или начните переписку из профиля пользователя.</p>
            </div>
          )}

          {activeConversationId && (
            <>
              <header className="messagesPage__chatHead">
                <h2 className="messagesPage__chatTitle">
                  {getDisplayName(activeConversation?.participant)}
                </h2>
              </header>

              <div className="messagesPage__messages">
                {loadingChat && <p className="messagesPage__hint">Загрузка сообщений...</p>}
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
                  placeholder="Напишите сообщение..."
                  maxLength={4000}
                  disabled={sending}
                />
                <button type="submit" className="messagesPage__sendBtn" disabled={sending || !draft.trim()}>
                  {sending ? "..." : "Send"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
