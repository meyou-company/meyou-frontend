import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MESSAGE_CREATED_EVENT,
  MESSAGE_DELETED_EVENT,
  MESSAGE_PINNED_EVENT,
  MESSAGE_REACTION_ADDED_EVENT,
  MESSAGE_REACTION_REMOVED_EVENT,
  MESSAGE_READ_EVENT,
  MESSAGE_SEEN_EVENT,
  MESSAGE_UNPINNED_EVENT,
  MESSAGE_UPDATED_EVENT,
  USER_STOP_TYPING_EVENT,
  USER_TYPING_EVENT,
} from '../../constants/messageEvents';
import profileIcons from '../../constants/profileIcons';
import AppHeader from '../../components/Layout/AppHeader';
import EditMessageModal from '../../components/Messages/EditMessageModal';
import ForwardMessageModal from '../../components/Messages/ForwardMessageModal';
import MessageBubble from '../../components/Messages/MessageBubble';
import MessageComposer from '../../components/Messages/MessageComposer';
import MessageContextMenu from '../../components/Messages/MessageContextMenu';
import MessageSearchPanel from '../../components/Messages/MessageSearchPanel';
import MessageSoundToggle from '../../components/Messages/MessageSoundToggle';
import MessagesNavBadge from '../../components/Messages/MessagesNavBadge';
import ReportMessageModal from '../../components/Messages/ReportMessageModal';
import TypingIndicator from '../../components/Messages/TypingIndicator';
import { conversationsApi } from '../../services/conversationsApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import {
  collectSeenOutgoingIds,
  extractSeenTargetIds,
  markOutgoingSeenFromEnvelope,
  mergeSeenMessageIds,
} from '../../utils/messageReadReceipt';
import { useMessageActions } from '../../hooks/useMessageActions';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useMessagesStore } from '../../zustand/useMessagesStore';
import './MessagesPage.scss';

function getDisplayName(user, fallback) {
  if (!user) return fallback;
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || fallback;
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
      typeof envelope.unreadCount === 'number'
        ? envelope.unreadCount
        : (current.unreadCount || 0) + 1,
  };

  const rest = prev.filter((_, i) => i !== index);
  return sortConversations([updated, ...rest]);
}

function dayKey(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return '';
  }
}

function dayLabel(iso, t) {
  if (!iso) return '';
  const key = dayKey(iso);
  const todayKey = dayKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKey(yesterday.toISOString());
  if (key === todayKey) return t('messenger.dateToday');
  if (key === yesterdayKey) return t('messenger.dateYesterday');
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return '';
  }
}

function groupMessagesWithDates(messages, t) {
  const items = [];
  let lastDay = null;
  for (const message of messages) {
    if (!message?.id) continue;
    const key = dayKey(message.createdAt);
    if (key && key !== lastDay) {
      items.push({ type: 'date', id: `date-${key}`, label: dayLabel(message.createdAt, t) });
      lastDay = key;
    }
    items.push({ type: 'message', id: message.id, message });
  }
  return items;
}

function applyReactionAdded(messages, envelope) {
  const { messageId, reaction } = envelope;
  if (!messageId || !reaction) return messages;
  return messages.map((m) => {
    if (String(m.id) !== String(messageId)) return m;
    const reactions = [...(m.reactions || [])];
    const idx = reactions.findIndex((r) => String(r.userId) === String(reaction.userId));
    if (idx >= 0) reactions[idx] = reaction;
    else reactions.push(reaction);
    return { ...m, reactions };
  });
}

function applyReactionRemoved(messages, envelope, currentUserId) {
  const { messageId, reaction } = envelope;
  if (!messageId) return messages;
  const userId = reaction?.userId ?? envelope.userId ?? currentUserId;
  if (!userId) return messages;
  return messages.map((m) => {
    if (String(m.id) !== String(messageId)) return m;
    return {
      ...m,
      reactions: (m.reactions || []).filter((r) => String(r.userId) !== String(userId)),
    };
  });
}

function isConversationMuted(conversation) {
  if (!conversation?.mutedUntil) return false;
  return new Date(conversation.mutedUntil).getTime() > Date.now();
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
  const [draft, setDraft] = useState('');
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [menuState, setMenuState] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [reportMessage, setReportMessage] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [typingUserId, setTypingUserId] = useState(null);
  const [pinnedMessageId, setPinnedMessageId] = useState(null);
  const [seenMessageIds, setSeenMessageIds] = useState(() => new Set());
  const [mutedOverrides, setMutedOverrides] = useState({});

  const messagesEndRef = useRef(null);
  const activeConversationId = conversationId || null;

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const peerId = activeConversation?.participant?.id;

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((chat) => {
      const name = getDisplayName(chat.participant, '').toLowerCase();
      const preview = (chat.lastMessage?.text || '').toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, searchQuery]);

  const groupedMessages = useMemo(
    () => groupMessagesWithDates(messages, t),
    [messages, t],
  );

  const pinnedMessage = useMemo(
    () => messages.find((m) => String(m.id) === String(pinnedMessageId)) ?? null,
    [messages, pinnedMessageId],
  );

  const isMuted = useMemo(() => {
    if (!activeConversationId) return false;
    if (Object.prototype.hasOwnProperty.call(mutedOverrides, activeConversationId)) {
      return mutedOverrides[activeConversationId];
    }
    return isConversationMuted(activeConversation);
  }, [activeConversation, activeConversationId, mutedOverrides]);

  useEffect(() => {
    setActiveConversationId(activeConversationId);
    return () => setActiveConversationId(null);
  }, [activeConversationId, setActiveConversationId]);

  useEffect(() => {
    if (!isAuthed) {
      navigate('/auth/login', {
        replace: true,
        state: {
          redirectTo: activeConversationId
            ? `/messages/${activeConversationId}`
            : '/messages',
        },
      });
    }
  }, [isAuthed, navigate, activeConversationId]);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      setListError('');
      const items = await conversationsApi.list();
      setConversations(sortConversations(Array.isArray(items) ? items : []));
    } catch (err) {
      console.error('[messages] list failed', err);
      setListError(getApiErrorMessage(err, 'messenger.loadChatsError'));
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
        if (typeof result?.totalUnreadCount === 'number') {
          setTotalUnreadCount(result.totalUnreadCount);
        }
        applyConversationRead(result);
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(id) ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch (err) {
        console.error('[messages] mark read failed', err);
      }
    },
    [setTotalUnreadCount, applyConversationRead],
  );

  const loadMessages = useCallback(
    async (id) => {
      if (!id) {
        setMessages([]);
        setSeenMessageIds(new Set());
        return;
      }
      try {
        setLoadingChat(true);
        const result = await conversationsApi.getMessages(id, { limit: 100 });
        const items = result.items || [];
        setMessages(items);
        setSeenMessageIds(collectSeenOutgoingIds(items, currentUserId));
        if (typeof result.totalUnreadCount === 'number') {
          setTotalUnreadCount(result.totalUnreadCount);
        }
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(id) ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch (err) {
        console.error('[messages] chat failed', err);
        toast.error(getApiErrorMessage(err, 'messenger.loadMessagesError'));
        setMessages([]);
        setSeenMessageIds(new Set());
      } finally {
        setLoadingChat(false);
      }
    },
    [currentUserId, setTotalUnreadCount],
  );

  useEffect(() => {
    if (!isAuthed) return;
    loadConversations();
    fetchTotalUnreadCount();
  }, [isAuthed, loadConversations, fetchTotalUnreadCount]);

  useEffect(() => {
    if (!isAuthed || !activeConversationId) return;
    setReplyTo(null);
    setShowChatSearch(false);
    setTypingUserId(null);
    setPinnedMessageId(null);
    setSeenMessageIds(new Set());
    setHighlightMessageId(null);
    loadMessages(activeConversationId);
    void markChatRead(activeConversationId);
  }, [isAuthed, activeConversationId, loadMessages, markChatRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId, typingUserId]);

  useEffect(() => {
    if (!highlightMessageId) return undefined;
    const el = document.querySelector(`[data-message-id="${highlightMessageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightMessageId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightMessageId, messages]);

  const appendOrUpdateMessage = useCallback((message) => {
    if (!message?.id) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => String(m.id) === String(message.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...message };
        return next;
      }
      return [...prev, message];
    });
    if (
      currentUserId &&
      String(message.senderId) === String(currentUserId) &&
      (message.deliveryStatus === 'SEEN' || message.readAt)
    ) {
      setSeenMessageIds((prev) => new Set(prev).add(String(message.id)));
    }
  }, [currentUserId]);

  useEffect(() => {
    const matchesActive = (convId) =>
      activeConversationId && convId && String(convId) === String(activeConversationId);

    const onCreated = (event) => {
      const envelope = event?.detail;
      const message = envelope?.message;
      const convId = envelope?.conversationId;
      if (!message?.id || !convId) return;

      setConversations((prev) => {
        const next = upsertConversationFromMessage(prev, envelope);
        if (next === prev) void loadConversations();
        return next;
      });

      if (matchesActive(convId)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(message.id))) return prev;
          return [...prev, message];
        });
        void markChatRead(convId);
      }
    };

    const onRead = (event) => {
      const envelope = event?.detail;
      const convId = envelope?.conversationId;
      if (!convId) return;
      if (typeof envelope.totalUnreadCount === 'number') {
        setTotalUnreadCount(envelope.totalUnreadCount);
      }
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(convId) ? { ...c, unreadCount: 0 } : c,
        ),
      );
    };

    const onUpdated = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId) || !envelope?.message) return;
      appendOrUpdateMessage(envelope.message);
    };

    const onDeleted = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      const message = envelope?.message;
      if (message?.deletedForEveryone) {
        appendOrUpdateMessage(message);
      } else if (envelope?.messageId) {
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(envelope.messageId)));
      }
    };

    const onSeen = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;

      if (
        envelope?.message &&
        String(envelope.message.senderId) !== String(currentUserId)
      ) {
        return;
      }

      const hasTargets =
        extractSeenTargetIds(envelope).size > 0 || Boolean(envelope?.message?.id);
      if (!hasTargets) return;

      setMessages((prev) => {
        const next = markOutgoingSeenFromEnvelope(prev, envelope, currentUserId);
        setSeenMessageIds((prevIds) =>
          mergeSeenMessageIds(prevIds, envelope, next, currentUserId),
        );
        return next;
      });
    };

    const onReactionAdded = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      if (!envelope?.messageId || !envelope?.reaction) return;
      setMessages((prev) => applyReactionAdded(prev, envelope));
    };

    const onReactionRemoved = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      if (!envelope?.messageId) return;
      setMessages((prev) => applyReactionRemoved(prev, envelope, currentUserId));
    };

    const onPinned = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      setPinnedMessageId(envelope?.messageId ?? null);
    };

    const onUnpinned = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      const unpinnedId = envelope?.messageId;
      if (!unpinnedId) return;
      setPinnedMessageId((prev) =>
        String(unpinnedId) === String(prev) ? null : prev,
      );
    };

    const onTyping = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      if (String(envelope?.typingUserId) === String(currentUserId)) return;
      setTypingUserId(envelope?.typingUserId ?? null);
    };

    const onStopTyping = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      const stoppedUserId = envelope?.typingUserId;
      if (!stoppedUserId) return;
      setTypingUserId((prev) =>
        String(stoppedUserId) === String(prev) ? null : prev,
      );
    };

    window.addEventListener(MESSAGE_CREATED_EVENT, onCreated);
    window.addEventListener(MESSAGE_READ_EVENT, onRead);
    window.addEventListener(MESSAGE_UPDATED_EVENT, onUpdated);
    window.addEventListener(MESSAGE_DELETED_EVENT, onDeleted);
    window.addEventListener(MESSAGE_SEEN_EVENT, onSeen);
    window.addEventListener(MESSAGE_REACTION_ADDED_EVENT, onReactionAdded);
    window.addEventListener(MESSAGE_REACTION_REMOVED_EVENT, onReactionRemoved);
    window.addEventListener(MESSAGE_PINNED_EVENT, onPinned);
    window.addEventListener(MESSAGE_UNPINNED_EVENT, onUnpinned);
    window.addEventListener(USER_TYPING_EVENT, onTyping);
    window.addEventListener(USER_STOP_TYPING_EVENT, onStopTyping);

    return () => {
      window.removeEventListener(MESSAGE_CREATED_EVENT, onCreated);
      window.removeEventListener(MESSAGE_READ_EVENT, onRead);
      window.removeEventListener(MESSAGE_UPDATED_EVENT, onUpdated);
      window.removeEventListener(MESSAGE_DELETED_EVENT, onDeleted);
      window.removeEventListener(MESSAGE_SEEN_EVENT, onSeen);
      window.removeEventListener(MESSAGE_REACTION_ADDED_EVENT, onReactionAdded);
      window.removeEventListener(MESSAGE_REACTION_REMOVED_EVENT, onReactionRemoved);
      window.removeEventListener(MESSAGE_PINNED_EVENT, onPinned);
      window.removeEventListener(MESSAGE_UNPINNED_EVENT, onUnpinned);
      window.removeEventListener(USER_TYPING_EVENT, onTyping);
      window.removeEventListener(USER_STOP_TYPING_EVENT, onStopTyping);
    };
  }, [
    activeConversationId,
    appendOrUpdateMessage,
    currentUserId,
    loadConversations,
    markChatRead,
    setTotalUnreadCount,
  ]);

  const handleSendPayload = async (payload) => {
    if (!activeConversationId || sending) return;

    const hasText = Boolean(payload?.text?.trim());
    const hasAttachments = Array.isArray(payload?.attachments) && payload.attachments.length > 0;
    if (!hasText && !hasAttachments) return;

    try {
      setSending(true);

      const body = {
        ...payload,
        replyToMessageId: replyTo?.id,
      };
      const created = await conversationsApi.sendMessage(activeConversationId, body);
      setDraft('');
      setReplyTo(null);
      appendOrUpdateMessage(created);
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
      console.error('[messages] send failed', err);
      toast.error(getApiErrorMessage(err, 'messenger.sendError'));
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    await handleSendPayload({ text, type: 'TEXT' });
  };

  const {
    handleMenuAction: runMenuAction,
    handleReaction,
  } = useMessageActions({
    onReply: setReplyTo,
    onForward: setForwardMessage,
    onReport: setReportMessage,
    onEdit: setEditMessage,
    onMessageRemoved: (messageId) => {
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
    },
    onMessageUpdated: appendOrUpdateMessage,
    onPinnedChange: setPinnedMessageId,
    pinnedMessageId,
  });

  const handleMenuAction = (actionId) => {
    const msg = menuState?.message;
    setMenuState(null);
    runMenuAction(actionId, msg);
  };

  const handleReactionSelect = async (message, emoji) => {
    const result = await handleReaction(message.id, emoji, message.reactions, currentUserId);
    if (!result) return;
    if (result.removed) {
      setMessages((prev) => applyReactionRemoved(prev, result, currentUserId));
    } else if (result.reaction) {
      setMessages((prev) => applyReactionAdded(prev, result));
    }
  };

  const toggleMute = async () => {
    if (!activeConversationId) return;
    try {
      const mutedUntil = isMuted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const result = await conversationsApi.muteConversation(activeConversationId, mutedUntil);
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(activeConversationId)
            ? { ...c, mutedUntil: result.mutedUntil }
            : c,
        ),
      );
      setMutedOverrides((prev) => ({
        ...prev,
        [activeConversationId]: !isMuted,
      }));
      toast.success(isMuted ? t('messenger.unmuteSuccess') : t('messenger.muteSuccess'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'errors.generic'));
    }
  };

  if (!isAuthed) return null;

  const showChatOnMobile = Boolean(activeConversationId);
  const peerName = getDisplayName(activeConversation?.participant, t('common.user'));

  return (
    <div className="messagesPage">
      <div className="messagesPage__bg" aria-hidden="true" />

      <div className="messagesPage__shell">
        <AppHeader
          variant="messenger"
          className="messagesPage__header"
          onGoProfile={() => navigate('/profile')}
          onGoExplore={() => navigate('/search')}
          onGoWallet={() => navigate('/wallet')}
          onGoVipChat={() => navigate('/vip-chat')}
          onGoHome={() => navigate('/first-page')}
        />

        <div className="messagesPage__content">
          <div className="messagesPage__topRule" aria-hidden="true" />

          <h1 className="messagesPage__title">
            {t('messenger.title')}
            <MessagesNavBadge className="messagesPage__titleBadge" />
          </h1>

          <div className="messagesPage__toolbar">
            <label className="messagesPage__searchWrap">
              <img
                src={profileIcons.searchMagnifier}
                alt=""
                className="messagesPage__searchIcon"
                aria-hidden="true"
              />
              <span className="messagesPage__searchInner">
                <input
                  type="search"
                  className="messagesPage__search"
                  placeholder={t('messenger.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('messenger.search')}
                />
                <span className="messagesPage__searchLine" aria-hidden="true" />
              </span>
            </label>

            <MessageSoundToggle />
          </div>

          <div className="messagesPage__body">
            <aside
              className={`messagesPage__sidebar${showChatOnMobile ? ' is-hidden-mobile' : ''}`}
            >
              {loadingList && (
                <p className="messagesPage__hint">{t('common.loading')}</p>
              )}
              {!loadingList && listError && (
                <p className="messagesPage__hint messagesPage__hint--error">{listError}</p>
              )}
              {!loadingList && !listError && filteredConversations.length === 0 && (
                <p className="messagesPage__hint">{t('messenger.noChats')}</p>
              )}

              <ul className="messagesPage__chatList">
                {filteredConversations.map((chat) => {
                  const isActive = chat.id === activeConversationId;
                  const name = getDisplayName(chat.participant, t('common.user'));
                  const preview = chat.lastMessage?.text || t('messenger.noMessages');
                  return (
                    <li key={chat.id}>
                      <Link
                        to={`/messages/${chat.id}`}
                        className={`messagesPage__chatItem${isActive ? ' is-active' : ''}`}
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
                            {chat.unreadCount > 0 ? (
                              <span className="messagesPage__unread">{chat.unreadCount}</span>
                            ) : null}
                          </div>
                          <p className="messagesPage__chatPreview">{preview}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section
              className={`messagesPage__chat${!showChatOnMobile ? ' is-hidden-mobile' : ''}`}
            >
              {!activeConversationId && (
                <div className="messagesPage__emptyChat">
                  <p>{t('messenger.selectChat')}</p>
                </div>
              )}

              {activeConversationId && (
                <>
                  <header className="messagesPage__chatHead">
                    <button
                      type="button"
                      className="messagesPage__backMobile"
                      onClick={() => navigate('/messages')}
                      aria-label={t('messenger.backToChats')}
                    >
                      <img src={profileIcons.arrowLeftBlack} alt="" aria-hidden="true" />
                    </button>
                    <h2 className="messagesPage__chatTitle">{peerName}</h2>
                    <div className="messagesPage__chatActions">
                      <button
                        type="button"
                        className={`messagesPage__chatAction${showChatSearch ? ' is-active' : ''}`}
                        onClick={() => setShowChatSearch((v) => !v)}
                        aria-label={t('messenger.searchInChat')}
                      >
                        <img src={profileIcons.searchMagnifier} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`messagesPage__chatAction${isMuted ? ' is-active' : ''}`}
                        onClick={() => void toggleMute()}
                        aria-label={isMuted ? t('messenger.unmuteChat') : t('messenger.muteChat')}
                      >
                        {isMuted ? '🔕' : '🔔'}
                      </button>
                    </div>
                  </header>

                  {showChatSearch ? (
                    <MessageSearchPanel
                      conversationId={activeConversationId}
                      onClose={() => setShowChatSearch(false)}
                      onSelectMessage={(messageId) => {
                        setHighlightMessageId(messageId);
                        setShowChatSearch(false);
                      }}
                    />
                  ) : null}

                  {pinnedMessage ? (
                    <div className="messagesPage__pinned">
                      <span className="messagesPage__pinnedLabel">{t('messenger.pinned')}</span>
                      <p className="messagesPage__pinnedText">
                        {pinnedMessage.deletedForEveryone
                          ? t('messenger.deletedMessage')
                          : pinnedMessage.text || t('messenger.attachmentPreview')}
                      </p>
                    </div>
                  ) : null}

                  <div className="messagesPage__messages">
                    {loadingChat && (
                      <p className="messagesPage__hint">{t('common.loading')}</p>
                    )}
                    {!loadingChat &&
                      groupedMessages.map((item) => {
                        if (item.type === 'date') {
                          return (
                            <div key={item.id} className="messagesPage__dateSep">
                              {item.label}
                            </div>
                          );
                        }
                        const msg = item.message;
                        const isMine = msg.senderId === currentUserId;
                        const peer = activeConversation?.participant;
                        return (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isMine={isMine}
                            currentUserId={currentUserId}
                            peerAvatarUrl={peer?.avatarUrl}
                            peerName={getDisplayName(peer, t('common.user'))}
                            highlight={String(msg.id) === String(highlightMessageId)}
                            onOpenMenu={(message, rect, bubbleTimeLabel, isMineBubble) => {
                              setMenuState({
                                message,
                                anchorRect: rect,
                                dateLabel: message.createdAt
                                  ? dayLabel(message.createdAt, t)
                                  : '',
                                timeLabel: bubbleTimeLabel,
                                isMine: isMineBubble,
                              });
                            }}
                            onReactionSelect={handleReactionSelect}
                            seenMessageIds={seenMessageIds}
                          />
                        );
                      })}
                    {typingUserId && String(typingUserId) === String(peerId) ? (
                      <TypingIndicator peerName={peerName} />
                    ) : null}
                    <div ref={messagesEndRef} />
                  </div>

                  <MessageComposer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={handleSend}
                    onSendPayload={handleSendPayload}
                    sending={sending}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    conversationId={activeConversationId}
                  />
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      <MessageContextMenu
        isOpen={Boolean(menuState)}
        anchorRect={menuState?.anchorRect}
        isMine={menuState?.isMine}
        message={menuState?.message}
        pinnedMessageId={pinnedMessageId}
        dateLabel={menuState?.dateLabel}
        timeLabel={menuState?.timeLabel}
        onClose={() => setMenuState(null)}
        onAction={handleMenuAction}
      />

      <ForwardMessageModal
        isOpen={Boolean(forwardMessage)}
        message={forwardMessage}
        conversations={conversations}
        currentConversationId={activeConversationId}
        onClose={() => setForwardMessage(null)}
      />

      <ReportMessageModal
        isOpen={Boolean(reportMessage)}
        message={reportMessage}
        onClose={() => setReportMessage(null)}
      />

      <EditMessageModal
        isOpen={Boolean(editMessage)}
        message={editMessage}
        onClose={() => setEditMessage(null)}
        onSaved={appendOrUpdateMessage}
      />
    </div>
  );
}
