import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuEyeOff } from 'react-icons/lu';
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
  CONVERSATION_DELETED_EVENT,
} from '../../constants/messageEvents';
import profileIcons from '../../constants/profileIcons';
import AppHeader from '../../components/Layout/AppHeader';
import ChatContextMenu from '../../components/Messages/ChatContextMenu';
import CreateGroupModal from '../../components/Messages/CreateGroupModal';
import EditMessageModal from '../../components/Messages/EditMessageModal';
import ForwardMessageModal from '../../components/Messages/ForwardMessageModal';
import GroupAvatar from '../../components/Messages/GroupAvatar';
import GroupInfoModal from '../../components/Messages/GroupInfoModal';
import MessageBubble from '../../components/Messages/MessageBubble';
import MessageComposer from '../../components/Messages/MessageComposer';
import MessageContextMenu from '../../components/Messages/MessageContextMenu';
import MessageSearchPanel from '../../components/Messages/MessageSearchPanel';
import MessagesNavBadge from '../../components/Messages/MessagesNavBadge';
import ReportMessageModal from '../../components/Messages/ReportMessageModal';
import TypingIndicator from '../../components/Messages/TypingIndicator';
import OnlineStatus from '../../components/Presence/OnlineStatus';
import StoryViewerModal from '../../components/Stories/StoryViewerModal';
import { conversationsApi } from '../../services/conversationsApi';
import { mergeConversationPages } from '../../utils/conversationListPage';
import { shouldFetchInboxAfterSearchClear } from '../../utils/inboxListLoadScheduling';
import {
  mergeInboxHeadRefresh,
  reconcileThreadWithLatestPage,
  MESSENGER_INITIAL_MESSAGE_LIMIT,
} from '../../utils/messengerCache';
import { useMessengerCacheStore } from '../../zustand/useMessengerCacheStore';
import { callsApi } from '../../services/callsApi';
import { usersApi } from '../../services/usersApi';
import { usePresenceStore } from '../../zustand/usePresenceStore';
import { getApiErrorCode, getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { resolveProfileUsername } from '../../utils/profileUsername';
import {
  collectSeenOutgoingIds,
  extractSeenTargetIds,
  markOutgoingSeenFromEnvelope,
  mergeSeenMessageIds,
} from '../../utils/messageReadReceipt';
import {
  createClientId,
  createOptimisticMessage,
  markOptimisticFailed,
  mergeMessageRecord,
  mergeOutgoingMessage,
} from '../../utils/optimisticChatMessage';
import {
  isNearBottom,
  mergeMessageHistory,
} from '../../utils/messageHistory';
import {
  conversationMatchesSearch,
  formatConversationClock,
  getConversationListPreview,
  getConversationTitle,
  getMessageSenderName,
  isGroupConversation,
  patchConversationLastMessage,
} from '../../utils/conversationPreview';
import {
  getConversationDraft,
  persistConversationDraft,
  readMessageDrafts,
} from '../../utils/messageDrafts';
import {
  canRedialCallEvent,
  formatCallEventLabel,
  getCallEventClock,
  getCallEventIcon,
  getCallRedialMediaType,
  getCallRedialPeerId,
} from '../../utils/callEventMessage';
import { useMessageActions } from '../../hooks/useMessageActions';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useMessagesStore } from '../../zustand/useMessagesStore';
import { startConversationCall, joinConversationGroupRoom } from '../../providers/CallsProvider';
import { useCallsStore } from '../../zustand/useCallsStore';
import { useGroupRoomsStore } from '../../zustand/useGroupRoomsStore';
import './MessagesPage.scss';

const MESSAGES_PAGE_SIZE = MESSENGER_INITIAL_MESSAGE_LIMIT;
const CONVERSATION_LIST_PAGE_SIZE = 10;
/** Min gap between visibility-triggered inbox/chat resync (avoids pool storms). */
const VISIBILITY_RESYNC_MIN_MS = 45_000;
const INBOX_SECONDARY_LOAD_DELAY_MS = 400;

function getDisplayName(user, fallback) {
  if (!user) return fallback;
  if (user.name?.trim()) return user.name.trim();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || fallback;
}

function GroupUsersIcon() {
  return (
    <svg
      className="messagesPage__createGroupIcon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.6 18.2c.8-3.4 3.3-5.1 5.4-5.1 2.1 0 4.6 1.7 5.4 5.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="16.6" cy="9.1" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M16.6 13.2c1.9 0 3.8 1.3 4.6 3.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GroupCreatePlusIcon() {
  return (
    <svg
      className="messagesPage__createGroupPlus"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 1.15v7.7M1.15 5h7.7"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

function sortConversations(items) {
  return [...items].sort((a, b) => {
    const aPinned = Boolean(a.isPinned || a.pinnedAt);
    const bPinned = Boolean(b.isPinned || b.pinnedAt);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    if (aPinned && bPinned && a.pinnedAt && b.pinnedAt) {
      const pinDiff =
        new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
      if (pinDiff !== 0) return pinDiff;
    }
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

function buildStoryViewerGroup(preview, fallbackAuthor) {
  if (!preview || preview.isUnavailable || !preview.mediaUrl) return null;

  const author = {
    ...(preview.author || {}),
    id: preview.author?.id || fallbackAuthor?.id,
    username: preview.author?.username || fallbackAuthor?.username || '',
    name: preview.author?.name || fallbackAuthor?.name || '',
    avatarUrl: preview.author?.avatarUrl || fallbackAuthor?.avatarUrl || null,
  };

  return {
    author,
    stories: [
      {
        id: preview.storyId,
        storyId: preview.storyId,
        mediaUrl: preview.mediaUrl,
        mediaType: preview.mediaType || 'image',
        text: preview.text || '',
        createdAt: preview.createdAt,
        expiresAt: preview.expiresAt,
        author,
        authorId: author.id,
      },
    ],
  };
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const setActiveConversationId = useMessagesStore((s) => s.setActiveConversationId);
  const setTotalUnreadCount = useMessagesStore((s) => s.setTotalUnreadCount);
  const applyConversationRead = useMessagesStore((s) => s.applyConversationRead);
  const fetchTotalUnreadCount = useMessagesStore((s) => s.fetchTotalUnreadCount);

  const [conversations, setConversations] = useState([]);
  const [hiddenConversations, setHiddenConversations] = useState([]);
  const [sidebarMode, setSidebarMode] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMoreList, setLoadingMoreList] = useState(false);
  const [listHasMore, setListHasMore] = useState(false);
  const [listNextCursor, setListNextCursor] = useState(null);
  const [serverSearchActive, setServerSearchActive] = useState(false);
  const [isMobileListViewport, setIsMobileListViewport] = useState(false);
  const [loadingHidden, setLoadingHidden] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [drafts, setDrafts] = useState({});
  const draftsRef = useRef({});
  const activeConversationIdRef = useRef(conversationId || null);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [menuState, setMenuState] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [reportMessage, setReportMessage] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [pinnedMessageId, setPinnedMessageId] = useState(null);
  const [seenMessageIds, setSeenMessageIds] = useState(() => new Set());
  const [mutedOverrides, setMutedOverrides] = useState({});
  const [storyViewerGroup, setStoryViewerGroup] = useState(null);
  const [chatMenu, setChatMenu] = useState(null);
  const hiddenIdsRef = useRef(new Set());
  const manuallyUnreadRef = useRef(new Set());
  const readInFlightRef = useRef(new Map());

  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const chatListScrollRef = useRef(null);
  const listLoadMoreSentinelRef = useRef(null);
  const listLoadInFlightRef = useRef(false);
  const inboxSecondaryLoadTimerRef = useRef(null);
  const listSearchGenRef = useRef(0);
  const messagesRef = useRef([]);
  const hasMoreOlderRef = useRef(false);
  const olderCursorRef = useRef(null);
  const chatLoadGenRef = useRef(0);
  const bgSyncInflightRef = useRef(new Map());
  const lastVisibilityResyncRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const longPressTimerRef = useRef(null);
  const startCallInFlightRef = useRef(false);
  const activeConversationId = conversationId || null;
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 768px)');
    const syncMobile = () => setIsMobileListViewport(mobile.matches);
    syncMobile();
    mobile.addEventListener('change', syncMobile);
    return () => mobile.removeEventListener('change', syncMobile);
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 768px)');
    const lock = () => {
      if (!activeConversationId || !mobile.matches) return undefined;
      const html = document.documentElement;
      const { overflow: prevHtml } = html.style;
      const { overflow: prevBody } = document.body.style;
      html.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('messages-chat-open');
      return () => {
        html.style.overflow = prevHtml;
        document.body.style.overflow = prevBody;
        document.body.classList.remove('messages-chat-open');
      };
    };

    let unlock = lock();
    const onChange = () => {
      unlock?.();
      unlock = lock();
    };
    mobile.addEventListener('change', onChange);
    return () => {
      mobile.removeEventListener('change', onChange);
      unlock?.();
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!currentUserId) {
      draftsRef.current = {};
      setDrafts({});
      return;
    }
    const stored = readMessageDrafts(currentUserId);
    draftsRef.current = stored;
    setDrafts(stored);
  }, [currentUserId]);

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => c.id === activeConversationId) ||
      hiddenConversations.find((c) => c.id === activeConversationId) ||
      null,
    [conversations, hiddenConversations, activeConversationId],
  );

  const peerId = activeConversation?.participant?.id;
  const isActiveGroup = isGroupConversation(activeConversation);
  const chatTitle = isActiveGroup
    ? getConversationTitle(activeConversation, t('messenger.group.untitled'))
    : getDisplayName(activeConversation?.participant, t('common.user'));

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || serverSearchActive) return conversations;
    return conversations.filter((chat) =>
      conversationMatchesSearch(chat, q, t, (user, fb) => getDisplayName(user, fb), drafts),
    );
  }, [conversations, drafts, searchQuery, serverSearchActive, t]);

  const filteredHiddenConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return hiddenConversations;
    return hiddenConversations.filter((chat) =>
      conversationMatchesSearch(chat, q, t, (user, fb) => getDisplayName(user, fb), drafts),
    );
  }, [hiddenConversations, drafts, searchQuery, t]);

  const sidebarConversations =
    sidebarMode === 'hidden' ? filteredHiddenConversations : filteredConversations;

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
    if (isAuthLoading) return;
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
  }, [isAuthLoading, isAuthed, navigate, activeConversationId]);

  const persistInboxCache = useCallback(
    (conversationsList, hasMore, nextCursor) => {
      if (!currentUserId) return;
      useMessengerCacheStore.getState().setInboxSnapshot({
        conversations: conversationsList,
        listHasMore: hasMore,
        listNextCursor: nextCursor,
      });
    },
    [currentUserId],
  );

  const applyConversationListPage = useCallback(
    (result, { append = false, backgroundHead = false } = {}) => {
      const items = Array.isArray(result?.items)
        ? result.items
        : Array.isArray(result)
          ? result
          : [];
      const list = sortConversations(items);
      usePresenceStore.getState().hydrateMany(
        list.map((c) => c.participant).filter(Boolean),
      );
      let nextHasMore = false;
      let nextCursor = null;
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        nextHasMore = Boolean(result.hasMore);
        nextCursor = result.nextCursor ?? null;
      }

      if (backgroundHead) {
        setConversations((prev) => {
          const next = sortConversations(mergeInboxHeadRefresh(prev, list));
          const snap = useMessengerCacheStore.getState().getInboxSnapshot();
          persistInboxCache(next, snap.listHasMore, snap.listNextCursor);
          return next;
        });
        return list;
      }

      if (append) {
        setListHasMore(nextHasMore);
        setListNextCursor(nextCursor);
      } else {
        setListHasMore(nextHasMore);
        setListNextCursor(nextCursor);
      }

      setConversations((prev) => {
        const next = append
          ? sortConversations(mergeConversationPages(prev, list))
          : list;
        persistInboxCache(next, nextHasMore, nextCursor);
        return next;
      });
      return list;
    },
    [persistInboxCache],
  );

  const loadHiddenConversationsRef = useRef(async () => {});

  const scheduleInboxSecondaryLoads = useCallback(() => {
    if (inboxSecondaryLoadTimerRef.current) {
      window.clearTimeout(inboxSecondaryLoadTimerRef.current);
    }
    inboxSecondaryLoadTimerRef.current = window.setTimeout(() => {
      inboxSecondaryLoadTimerRef.current = null;
      void loadHiddenConversationsRef.current();
      void fetchTotalUnreadCount();
    }, INBOX_SECONDARY_LOAD_DELAY_MS);
  }, [fetchTotalUnreadCount]);

  const loadConversations = useCallback(
    async ({ listGen, background = false } = {}) => {
      if (listLoadInFlightRef.current) return;
      listLoadInFlightRef.current = true;
      const hadInboxCache =
        (useMessengerCacheStore.getState().getInboxSnapshot().conversations
          ?.length ?? 0) > 0;
      try {
        if (!background) setLoadingList(true);
        setListError('');
        const result = await conversationsApi.list({
          limit: CONVERSATION_LIST_PAGE_SIZE,
        });
        if (listGen != null && listGen !== listSearchGenRef.current) return;
        if (background) {
          applyConversationListPage(result, { backgroundHead: true });
        } else {
          applyConversationListPage(result);
        }
      } catch (err) {
        console.error('[messages] list failed', err);
        if (!background) {
          setListError(getApiErrorMessage(err, 'messenger.loadChatsError'));
          if (!hadInboxCache) {
            setConversations([]);
            setListHasMore(false);
            setListNextCursor(null);
          }
        }
      } finally {
        if (!background) setLoadingList(false);
        listLoadInFlightRef.current = false;
        scheduleInboxSecondaryLoads();
      }
    },
    [applyConversationListPage, scheduleInboxSecondaryLoads],
  );

  const loadMoreConversations = useCallback(async () => {
    if (
      !listHasMore ||
      !listNextCursor ||
      loadingMoreList ||
      loadingList ||
      listLoadInFlightRef.current
    ) {
      return;
    }
    listLoadInFlightRef.current = true;
    try {
      setLoadingMoreList(true);
      const q = searchQuery.trim();
      const result = await conversationsApi.list({
        limit: CONVERSATION_LIST_PAGE_SIZE,
        cursor: listNextCursor,
        ...(serverSearchActive && q.length >= 2 ? { q } : {}),
      });
      applyConversationListPage(result, { append: true });
    } catch (err) {
      console.error('[messages] list page failed', err);
    } finally {
      setLoadingMoreList(false);
      listLoadInFlightRef.current = false;
    }
  }, [
    applyConversationListPage,
    listHasMore,
    listNextCursor,
    loadingList,
    loadingMoreList,
    searchQuery,
    serverSearchActive,
  ]);

  const searchConversationsServer = useCallback(
    async (query, listGen) => {
      const q = query.trim();
      if (q.length < 2) {
        setServerSearchActive(false);
        void loadConversations({ listGen });
        return;
      }
      if (listLoadInFlightRef.current) return;
      listLoadInFlightRef.current = true;
      try {
        setLoadingList(true);
        setListError('');
        const result = await conversationsApi.list({
          limit: CONVERSATION_LIST_PAGE_SIZE,
          q,
        });
        if (listGen != null && listGen !== listSearchGenRef.current) return;
        setServerSearchActive(true);
        applyConversationListPage(result);
      } catch (err) {
        console.error('[messages] search list failed', err);
        setListError(getApiErrorMessage(err, 'messenger.loadChatsError'));
      } finally {
        setLoadingList(false);
        listLoadInFlightRef.current = false;
      }
    },
    [applyConversationListPage, loadConversations],
  );

  useEffect(() => {
    hiddenIdsRef.current = new Set(
      hiddenConversations.map((c) => String(c.id)),
    );
  }, [hiddenConversations]);

  const loadHiddenConversations = useCallback(async () => {
    try {
      setLoadingHidden(true);
      const items = await conversationsApi.listHidden();
      const list = sortConversations(Array.isArray(items) ? items : []);
      usePresenceStore.getState().hydrateMany(
        list.map((c) => c.participant).filter(Boolean),
      );
      setHiddenConversations(list);
    } catch (err) {
      console.error('[messages] hidden list failed', err);
      setHiddenConversations([]);
    } finally {
      setLoadingHidden(false);
    }
  }, []);

  loadHiddenConversationsRef.current = loadHiddenConversations;

  const markChatRead = useCallback(
    async (id, { force = false, readUpToMessageId, chatGeneration } = {}) => {
      if (!id) return;
      const key = String(id);
      if (!force && manuallyUnreadRef.current.has(key)) return;
      const pending = readInFlightRef.current.get(key);
      if (pending) return pending;

      const request = (async () => {
        try {
          const result = await conversationsApi.markConversationRead(id, {
            readUpToMessageId,
          });
          if (
            chatGeneration != null &&
            chatGeneration !== chatLoadGenRef.current
          ) {
            return false;
          }
          manuallyUnreadRef.current.delete(key);
          if (typeof result?.totalUnreadCount === 'number') {
            setTotalUnreadCount(result.totalUnreadCount);
          } else if (result?.changed !== false) {
            void fetchTotalUnreadCount(true);
          }
          applyConversationRead(result || {});
          const unreadForConv =
            typeof result?.unreadCount === 'number'
              ? Math.max(0, result.unreadCount)
              : 0;
          setConversations((prev) =>
            prev.map((c) =>
              String(c.id) === key
                ? { ...c, unreadCount: unreadForConv }
                : c,
            ),
          );
          setHiddenConversations((prev) =>
            prev.map((c) =>
              String(c.id) === key
                ? { ...c, unreadCount: unreadForConv }
                : c,
            ),
          );
          return true;
        } catch (err) {
          console.error('[messages] mark read failed', err);
          if (force) throw err;
          return false;
        } finally {
          if (readInFlightRef.current.get(key) === request) {
            readInFlightRef.current.delete(key);
          }
        }
      })();

      readInFlightRef.current.set(key, request);
      return request;
    },
    [setTotalUnreadCount, applyConversationRead, fetchTotalUnreadCount],
  );

  const isMessengerCacheBound = useCallback(() => {
    const uid = useAuthStore.getState().user?.id;
    if (!uid) return false;
    return (
      String(uid) === String(useMessengerCacheStore.getState().getBoundUserId())
    );
  }, []);

  const saveThreadCache = useCallback(
    (conversationId, payload) => {
      if (!conversationId || !isMessengerCacheBound()) return;
      useMessengerCacheStore.getState().saveThread(conversationId, payload);
    },
    [isMessengerCacheBound],
  );

  const patchCachedThreadMessages = useCallback(
    (conversationId, updater) => {
      if (!conversationId || !isMessengerCacheBound()) return;
      useMessengerCacheStore.getState().updateThreadMessages(conversationId, updater);
    },
    [isMessengerCacheBound],
  );

  const handleConversationAccessLost = useCallback(
    (lostConversationId) => {
      if (!lostConversationId) return;
      const id = String(lostConversationId);
      useMessengerCacheStore.getState().removeThread(id);
      useMessengerCacheStore.getState().patchInboxConversations((prev) =>
        prev.filter((c) => String(c.id) !== id),
      );
      setConversations((prev) => prev.filter((c) => String(c.id) !== id));
      setHiddenConversations((prev) => prev.filter((c) => String(c.id) !== id));
      if (String(activeConversationIdRef.current) === id) {
        setMessages([]);
        setHasMoreOlder(false);
        olderCursorRef.current = null;
        setSeenMessageIds(new Set());
        navigate('/messages');
      }
    },
    [navigate],
  );

  const loadOlderMessagesRef = useRef(async () => {});

  const maybeFillViewportWithOlder = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el || loadingOlder || loadingChat) return;
    if (!hasMoreOlderRef.current) return;
    if (el.scrollHeight > el.clientHeight + 12) return;
    void loadOlderMessagesRef.current();
  }, [loadingOlder, loadingChat]);

  const syncMessagesInBackground = useCallback(
    async (id, gen) => {
      const key = String(id);
      const inflight = bgSyncInflightRef.current.get(key);
      if (inflight) return inflight;

      const request = (async () => {
        try {
          const result = await conversationsApi.getMessages(id, {
            limit: MESSAGES_PAGE_SIZE,
          });
          if (gen !== chatLoadGenRef.current || !isMessengerCacheBound()) return;
          const pageItems = result.items || [];
          let mergedSnapshot = [];
          setMessages((prev) => {
            const merged = reconcileThreadWithLatestPage(prev, pageItems);
            mergedSnapshot = merged;
            saveThreadCache(id, {
              messages: merged,
              hasMoreOlder: Boolean(result.hasMoreOlder),
              olderCursor: result.before ?? olderCursorRef.current,
            });
            return merged;
          });
          setHasMoreOlder(Boolean(result.hasMoreOlder));
          olderCursorRef.current = result.before ?? olderCursorRef.current;
          const uid = useAuthStore.getState().user?.id;
          setSeenMessageIds(collectSeenOutgoingIds(mergedSnapshot, uid));
          const newest = mergedSnapshot.length
            ? mergedSnapshot[mergedSnapshot.length - 1]?.id
            : undefined;
          void markChatRead(id, {
            readUpToMessageId: newest,
            chatGeneration: gen,
          });
          requestAnimationFrame(() => {
            if (gen === chatLoadGenRef.current) maybeFillViewportWithOlder();
          });
        } catch (err) {
          if (gen !== chatLoadGenRef.current) return;
          const status = err?.response?.status;
          if (status === 403 || status === 404) {
            handleConversationAccessLost(id);
            return;
          }
          console.error('[messages] background sync failed', err);
        } finally {
          if (bgSyncInflightRef.current.get(key) === request) {
            bgSyncInflightRef.current.delete(key);
          }
        }
      })();

      bgSyncInflightRef.current.set(key, request);
      return request;
    },
    [
      currentUserId,
      handleConversationAccessLost,
      isMessengerCacheBound,
      markChatRead,
      maybeFillViewportWithOlder,
      saveThreadCache,
    ],
  );

  const loadMessages = useCallback(
    async (id, { gen: passedGen } = {}) => {
      if (!id) {
        setMessages([]);
        setHasMoreOlder(false);
        olderCursorRef.current = null;
        setSeenMessageIds(new Set());
        return;
      }
      const gen = passedGen ?? ++chatLoadGenRef.current;
      try {
        setLoadingChat(true);
        stickToBottomRef.current = true;
        const result = await conversationsApi.getMessages(id, {
          limit: MESSAGES_PAGE_SIZE,
        });
        if (gen !== chatLoadGenRef.current || !isMessengerCacheBound()) return;
        const items = result.items || [];
        setMessages(items);
        setHasMoreOlder(Boolean(result.hasMoreOlder));
        olderCursorRef.current = result.before ?? null;
        const uid = useAuthStore.getState().user?.id;
        setSeenMessageIds(collectSeenOutgoingIds(items, uid));
        saveThreadCache(id, {
          messages: items,
          hasMoreOlder: Boolean(result.hasMoreOlder),
          olderCursor: result.before ?? null,
        });
        const newest = items.length ? items[items.length - 1]?.id : undefined;
        void markChatRead(id, {
          readUpToMessageId: newest,
          chatGeneration: gen,
        });
        requestAnimationFrame(() => {
          if (gen === chatLoadGenRef.current) maybeFillViewportWithOlder();
        });
      } catch (err) {
        if (gen !== chatLoadGenRef.current) return;
        const status = err?.response?.status;
        if (status === 403 || status === 404) {
          handleConversationAccessLost(id);
          return;
        }
        console.error('[messages] chat failed', err);
        toast.error(getApiErrorMessage(err, 'messenger.loadMessagesError'));
        const isServerOverload =
          status == null || status === 408 || status === 429 || status >= 500;
        if (isServerOverload) {
          const cached = useMessengerCacheStore.getState().getThread(id);
          if (cached?.messages?.length) {
            setMessages(cached.messages);
            setHasMoreOlder(Boolean(cached.hasMoreOlder));
            olderCursorRef.current = cached.olderCursor ?? null;
            setSeenMessageIds(
              collectSeenOutgoingIds(
                cached.messages,
                useAuthStore.getState().user?.id,
              ),
            );
          }
        } else {
          setMessages([]);
          setHasMoreOlder(false);
          olderCursorRef.current = null;
          setSeenMessageIds(new Set());
        }
      } finally {
        if (gen === chatLoadGenRef.current) setLoadingChat(false);
      }
    },
    [
      handleConversationAccessLost,
      isMessengerCacheBound,
      markChatRead,
      maybeFillViewportWithOlder,
      saveThreadCache,
    ],
  );

  const loadOlderMessages = useCallback(async () => {
    const id = activeConversationIdRef.current;
    const before = olderCursorRef.current;
    if (!id || !before || !hasMoreOlder || loadingOlder || loadingChat) return;

    const gen = chatLoadGenRef.current;
    const scrollEl = messagesScrollRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;

    try {
      setLoadingOlder(true);
      const result = await conversationsApi.getMessages(id, {
        before,
        limit: MESSAGES_PAGE_SIZE,
      });
      if (gen !== chatLoadGenRef.current || !isMessengerCacheBound()) return;
      let merged = [];
      setMessages((prev) => {
        merged = mergeMessageHistory(prev, result.items || []);
        saveThreadCache(id, {
          messages: merged,
          hasMoreOlder: Boolean(result.hasMoreOlder),
          olderCursor: result.before ?? null,
        });
        return merged;
      });
      setHasMoreOlder(Boolean(result.hasMoreOlder));
      olderCursorRef.current = result.before ?? null;
      requestAnimationFrame(() => {
        const el = messagesScrollRef.current;
        if (!el || gen !== chatLoadGenRef.current) return;
        const delta = el.scrollHeight - prevHeight;
        if (delta > 0) el.scrollTop += delta;
      });
    } catch (err) {
      console.error('[messages] older messages failed', err);
    } finally {
      if (gen === chatLoadGenRef.current) setLoadingOlder(false);
    }
  }, [hasMoreOlder, loadingOlder, loadingChat, isMessengerCacheBound, saveThreadCache]);

  loadOlderMessagesRef.current = loadOlderMessages;

  const syncMessagesInBackgroundRef = useRef(syncMessagesInBackground);
  syncMessagesInBackgroundRef.current = syncMessagesInBackground;
  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;
  const maybeFillViewportWithOlderRef = useRef(maybeFillViewportWithOlder);
  maybeFillViewportWithOlderRef.current = maybeFillViewportWithOlder;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreOlderRef.current = hasMoreOlder;
  }, [hasMoreOlder]);

  useEffect(() => {
    if (!currentUserId || serverSearchActive || sidebarMode !== 'inbox') return;
    persistInboxCache(conversations, listHasMore, listNextCursor);
  }, [
    conversations,
    listHasMore,
    listNextCursor,
    currentUserId,
    serverSearchActive,
    sidebarMode,
    persistInboxCache,
  ]);

  useEffect(() => {
    if (!isAuthed || !currentUserId) return;
    useMessengerCacheStore.getState().bindUser(currentUserId);
    const snap = useMessengerCacheStore.getState().getInboxSnapshot();
    if (snap.conversations.length > 0) {
      setConversations(sortConversations(snap.conversations));
      setListHasMore(snap.listHasMore);
      setListNextCursor(snap.listNextCursor);
      setLoadingList(false);
      void loadConversations({ background: true });
    } else {
      void loadConversations();
    }
    return () => {
      if (inboxSecondaryLoadTimerRef.current) {
        window.clearTimeout(inboxSecondaryLoadTimerRef.current);
        inboxSecondaryLoadTimerRef.current = null;
      }
    };
  }, [isAuthed, currentUserId, loadConversations]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (sidebarMode !== 'inbox') return undefined;
    const listGen = ++listSearchGenRef.current;
    const timer = window.setTimeout(() => {
      if (q.length >= 2) {
        void searchConversationsServer(q, listGen);
      } else if (shouldFetchInboxAfterSearchClear(serverSearchActive, q)) {
        setServerSearchActive(false);
        void loadConversations({ listGen });
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    searchQuery,
    sidebarMode,
    searchConversationsServer,
    serverSearchActive,
    loadConversations,
  ]);

  useEffect(() => {
    if (
      !isMobileListViewport ||
      !listHasMore ||
      sidebarMode !== 'inbox' ||
      serverSearchActive ||
      searchQuery.trim().length >= 2
    ) {
      return undefined;
    }
    const root = chatListScrollRef.current;
    const target = listLoadMoreSentinelRef.current;
    if (!root || !target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMoreConversations();
        }
      },
      { root, rootMargin: '96px 0px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    isMobileListViewport,
    listHasMore,
    sidebarMode,
    serverSearchActive,
    searchQuery,
    loadMoreConversations,
    conversations.length,
  ]);

  useEffect(() => {
    if (!isAuthed || !activeConversationId || activeConversation) return undefined;
    let cancelled = false;
    conversationsApi
      .getById(activeConversationId)
      .then((row) => {
        if (cancelled || !row?.id) return;
        if (row.isHidden) {
          setHiddenConversations((prev) => {
            if (prev.some((c) => String(c.id) === String(row.id))) return prev;
            return sortConversations([row, ...prev]);
          });
          return;
        }
        setConversations((prev) => {
          if (prev.some((c) => String(c.id) === String(row.id))) return prev;
          return sortConversations([row, ...prev]);
        });
        setHiddenConversations((prev) =>
          prev.filter((c) => String(c.id) !== String(row.id)),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAuthed, activeConversation, activeConversationId]);

  useEffect(() => {
    if (!isAuthed || !activeConversationId) return;
    const openingId = activeConversationId;
    manuallyUnreadRef.current.delete(String(openingId));
    setReplyTo(null);
    setShowChatSearch(false);
    setTypingUserIds([]);
    setShowGroupInfo(false);
    setPinnedMessageId(null);
    setHighlightMessageId(null);

    const gen = ++chatLoadGenRef.current;
    const cached = currentUserId
      ? useMessengerCacheStore.getState().getThread(openingId)
      : null;

    if (cached?.messages?.length) {
      setMessages(cached.messages);
      setHasMoreOlder(Boolean(cached.hasMoreOlder));
      olderCursorRef.current = cached.olderCursor ?? null;
      setSeenMessageIds(
        collectSeenOutgoingIds(cached.messages, currentUserId),
      );
      setLoadingChat(false);
      stickToBottomRef.current = true;
      requestAnimationFrame(() => {
        if (gen !== chatLoadGenRef.current) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        maybeFillViewportWithOlderRef.current();
      });
      void syncMessagesInBackgroundRef.current(openingId, gen);
    } else {
      const staleCache = currentUserId
        ? useMessengerCacheStore.getState().getThread(openingId)
        : null;
      if (staleCache?.messages?.length) {
        setMessages(staleCache.messages);
        setHasMoreOlder(Boolean(staleCache.hasMoreOlder));
        olderCursorRef.current = staleCache.olderCursor ?? null;
        setSeenMessageIds(
          collectSeenOutgoingIds(staleCache.messages, currentUserId),
        );
        setLoadingChat(false);
        void syncMessagesInBackgroundRef.current(openingId, gen);
      } else {
        setHasMoreOlder(false);
        olderCursorRef.current = null;
        setSeenMessageIds(new Set());
        setMessages([]);
        void loadMessagesRef.current(openingId, { gen });
      }
    }

    return () => {
      if (!currentUserId || !openingId) return;
      useMessengerCacheStore.getState().saveThread(openingId, {
        messages: messagesRef.current,
        hasMoreOlder: hasMoreOlderRef.current,
        olderCursor: olderCursorRef.current,
      });
    };
  }, [isAuthed, activeConversationId, currentUserId]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !activeConversationId) return undefined;

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom(el);
      if (el.scrollTop < 96 && hasMoreOlder && !loadingOlder && !loadingChat) {
        void loadOlderMessages();
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [
    activeConversationId,
    hasMoreOlder,
    loadingOlder,
    loadingChat,
    loadOlderMessages,
  ]);

  useEffect(() => {
    if (loadingChat) return;
    if (!stickToBottomRef.current && !typingUserIds.length) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: typingUserIds.length ? 'smooth' : 'auto',
    });
  }, [messages, activeConversationId, typingUserIds, loadingChat]);

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
        next[idx] = mergeMessageRecord(prev[idx], message);
        return next;
      }
      if (
        message.clientId &&
        prev.some((m) => String(m.clientId) === String(message.clientId))
      ) {
        return mergeOutgoingMessage(
          prev,
          `optimistic-${message.clientId}`,
          message,
        );
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

      if (hiddenIdsRef.current.has(String(convId))) {
        setHiddenConversations((prev) =>
          upsertConversationFromMessage(prev, envelope),
        );
      } else {
        setConversations((prev) => {
          const next = upsertConversationFromMessage(prev, envelope);
          if (next === prev) {
            void conversationsApi.getById(convId).then((row) => {
              if (!row?.id) return;
              setConversations((current) =>
                sortConversations(
                  mergeConversationPages(
                    [{ ...row, lastMessage: message, updatedAt: message.createdAt }],
                    current,
                  ),
                ),
              );
            });
          }
          return next;
        });
      }

      if (matchesActive(convId)) {
        const nearBottom = isNearBottom(messagesScrollRef.current);
        stickToBottomRef.current = nearBottom;
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(message.id))) return prev;
          if (
            message.clientId &&
            prev.some((m) => String(m.clientId) === String(message.clientId))
          ) {
            return mergeOutgoingMessage(
              prev,
              `optimistic-${message.clientId}`,
              message,
            );
          }
          return mergeMessageHistory(prev, [message]);
        });
        void markChatRead(convId, { readUpToMessageId: message.id });
      }
    };

    const onRead = (event) => {
      const envelope = event?.detail;
      const convId = envelope?.conversationId;
      if (!convId) return;
      if (manuallyUnreadRef.current.has(String(convId))) return;
      if (typeof envelope.totalUnreadCount === 'number') {
        setTotalUnreadCount(envelope.totalUnreadCount);
      }
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(convId) ? { ...c, unreadCount: 0 } : c,
        ),
      );
      setHiddenConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(convId) ? { ...c, unreadCount: 0 } : c,
        ),
      );
    };

    const onUpdated = (event) => {
      const envelope = event?.detail;
      const convId = envelope?.conversationId;
      const message = envelope?.message;
      if (!convId || !message?.id) return;

      setConversations((prev) => patchConversationLastMessage(prev, convId, message));

      patchCachedThreadMessages(convId, (prev) => {
        const idx = prev.findIndex((m) => String(m.id) === String(message.id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = mergeMessageRecord(prev[idx], message);
          return next;
        }
        if (
          message.clientId &&
          prev.some((m) => String(m.clientId) === String(message.clientId))
        ) {
          return mergeOutgoingMessage(prev, `optimistic-${message.clientId}`, message);
        }
        return mergeMessageHistory(prev, [message]);
      });

      if (!matchesActive(convId)) return;
      if (
        message.clientId &&
        currentUserId &&
        String(message.senderId) === String(currentUserId)
      ) {
        setMessages((prev) =>
          mergeOutgoingMessage(prev, `optimistic-${message.clientId}`, message),
        );
        return;
      }
      appendOrUpdateMessage(message);
    };

    const onDeleted = (event) => {
      const envelope = event?.detail;
      const convId = envelope?.conversationId;
      if (!convId) return;

      const message = envelope?.message;
      if (message?.deletedForEveryone) {
        setConversations((prev) => patchConversationLastMessage(prev, convId, message));
        patchCachedThreadMessages(convId, (prev) => {
          const idx = prev.findIndex((m) => String(m.id) === String(message.id));
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = mergeMessageRecord(prev[idx], message);
            return next;
          }
          return mergeMessageHistory(prev, [message]);
        });
        if (matchesActive(convId)) appendOrUpdateMessage(message);
        return;
      }

      if (envelope?.messageId) {
        patchCachedThreadMessages(convId, (prev) =>
          prev.filter((m) => String(m.id) !== String(envelope.messageId)),
        );
        setConversations((prev) => {
          const chat = prev.find((c) => String(c.id) === String(convId));
          if (String(chat?.lastMessage?.id) === String(envelope.messageId)) {
            void conversationsApi.getById(convId).then((row) => {
              if (!row?.id) return;
              setConversations((current) => {
                const i = current.findIndex(
                  (c) => String(c.id) === String(convId),
                );
                if (i < 0) return current;
                const next = [...current];
                next[i] = { ...next[i], ...row };
                return sortConversations(next);
              });
            });
          }
          return prev;
        });
        if (matchesActive(convId)) {
          setMessages((prev) => prev.filter((m) => String(m.id) !== String(envelope.messageId)));
        }
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
      const convId = envelope?.conversationId;
      if (!convId || !envelope?.messageId || !envelope?.reaction) return;
      patchCachedThreadMessages(convId, (prev) => applyReactionAdded(prev, envelope));
      if (!matchesActive(convId)) return;
      setMessages((prev) => applyReactionAdded(prev, envelope));
    };

    const onReactionRemoved = (event) => {
      const envelope = event?.detail;
      const convId = envelope?.conversationId;
      if (!convId || !envelope?.messageId) return;
      patchCachedThreadMessages(convId, (prev) =>
        applyReactionRemoved(prev, envelope, currentUserId),
      );
      if (!matchesActive(convId)) return;
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
      const typerId = envelope?.typingUserId;
      if (!typerId || String(typerId) === String(currentUserId)) return;
      setTypingUserIds((prev) =>
        prev.includes(String(typerId)) ? prev : [...prev, String(typerId)],
      );
    };

    const onStopTyping = (event) => {
      const envelope = event?.detail;
      if (!matchesActive(envelope?.conversationId)) return;
      const stoppedUserId = envelope?.typingUserId;
      if (!stoppedUserId) return;
      setTypingUserIds((prev) =>
        prev.filter((id) => String(id) !== String(stoppedUserId)),
      );
    };

    const onConversationDeleted = (event) => {
      const convId = event?.detail?.conversationId;
      if (!convId) return;
      useMessengerCacheStore.getState().removeThread(convId);
      useMessengerCacheStore.getState().patchInboxConversations((prev) =>
        prev.filter((c) => String(c.id) !== String(convId)),
      );
      setConversations((prev) =>
        prev.filter((c) => String(c.id) !== String(convId)),
      );
      setShowGroupInfo(false);
      if (String(activeConversationId) === String(convId)) {
        setMessages([]);
        navigate('/messages');
      }
      void fetchTotalUnreadCount(true);
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
    window.addEventListener(CONVERSATION_DELETED_EVENT, onConversationDeleted);

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
      window.removeEventListener(CONVERSATION_DELETED_EVENT, onConversationDeleted);
    };
  }, [
    activeConversationId,
    appendOrUpdateMessage,
    currentUserId,
    fetchTotalUnreadCount,
    loadConversations,
    markChatRead,
    navigate,
    patchCachedThreadMessages,
    setTotalUnreadCount,
  ]);

  useEffect(() => {
    if (!isAuthed || !currentUserId) return undefined;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isMessengerCacheBound()) return;
      const now = Date.now();
      if (now - lastVisibilityResyncRef.current < VISIBILITY_RESYNC_MIN_MS) {
        return;
      }
      lastVisibilityResyncRef.current = now;
      void loadConversations({ background: true });
      const activeId = activeConversationIdRef.current;
      if (activeId) {
        void syncMessagesInBackgroundRef.current(
          activeId,
          chatLoadGenRef.current,
        );
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [
    isAuthed,
    currentUserId,
    isMessengerCacheBound,
    loadConversations,
  ]);

  const handleDraftChange = useCallback(
    (text) => {
      if (!activeConversationId) return;
      const next = persistConversationDraft(
        currentUserId,
        draftsRef.current,
        activeConversationId,
        text,
      );
      draftsRef.current = next;
      setDrafts(next);
    },
    [activeConversationId, currentUserId],
  );

  const handleSendPayload = async (payload) => {
    const conversationIdForSend = activeConversationId;
    if (!conversationIdForSend || !currentUserId) return;

    const hasText = Boolean(payload?.text?.trim());
    const hasAttachments = Array.isArray(payload?.attachments) && payload.attachments.length > 0;
    const hasLunmeyo = Boolean(payload?.metadata?.lunmeyoStickerId);
    if (!hasText && !hasAttachments && !hasLunmeyo) return;

    const clientId = createClientId();
    const replySnapshot = replyTo;
    const optimistic = createOptimisticMessage({
      clientId,
      conversationId: conversationIdForSend,
      senderId: currentUserId,
      sender: {
        id: currentUser?.id,
        username: currentUser?.username,
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
        avatarUrl: currentUser?.avatarUrl,
        name: getDisplayName(currentUser, ''),
      },
      payload,
      replyTo: replySnapshot,
    });

    appendOrUpdateMessage(optimistic);
    const patchOptimisticLast = (c) =>
      String(c.id) === String(conversationIdForSend)
        ? { ...c, lastMessage: optimistic, updatedAt: optimistic.createdAt }
        : c;
    setHiddenConversations((prev) => prev.map(patchOptimisticLast));
    setConversations((prev) => sortConversations(prev.map(patchOptimisticLast)));

    const nextDrafts = persistConversationDraft(
      currentUserId,
      draftsRef.current,
      conversationIdForSend,
      '',
    );
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    setReplyTo(null);

    void conversationsApi
      .sendMessage(conversationIdForSend, {
        ...payload,
        replyToMessageId: replySnapshot?.id,
        clientId,
      })
      .then((created) => {
        if (String(activeConversationIdRef.current) === String(conversationIdForSend)) {
          setMessages((prev) => mergeOutgoingMessage(prev, optimistic.id, created));
        }
        const patchLastMessage = (c) =>
          String(c.id) === String(conversationIdForSend)
            ? { ...c, lastMessage: created, updatedAt: created.createdAt }
            : c;
        setHiddenConversations((prev) => prev.map(patchLastMessage));
        setConversations((prev) => sortConversations(prev.map(patchLastMessage)));
      })
      .catch((err) => {
        console.error('[messages] send failed', err);
        if (String(activeConversationIdRef.current) === String(conversationIdForSend)) {
          setMessages((prev) => markOptimisticFailed(prev, optimistic.id));
        }
        toast.error(getApiErrorMessage(err, 'messenger.sendError'));
      });
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

  const callPhase = useCallsStore((s) => s.phase);
  const activeCall = useCallsStore((s) => s.call);
  const callBusy = callPhase !== 'idle';
  const groupRoom = useGroupRoomsStore((s) =>
    activeConversationId ? s.byConversationId[activeConversationId] : null,
  );
  const inThisGroupRoom =
    isActiveGroup &&
    callBusy &&
    activeCall?.kind === 'GROUP' &&
    String(activeCall?.conversationId) === String(activeConversationId);

  useEffect(() => {
    if (!isActiveGroup || !activeConversationId) return undefined;
    let cancelled = false;
    void callsApi
      .getConversationActive(activeConversationId)
      .then((data) => {
        if (cancelled) return;
        if (data?.call) useGroupRoomsStore.getState().upsertFromCall(data.call);
        else useGroupRoomsStore.getState().removeByConversationId(activeConversationId);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [isActiveGroup, activeConversationId]);

  const startCall = async (mediaType) => {
    if (!activeConversationId || startCallInFlightRef.current) {
      return;
    }
    if (isGroupConversation(activeConversation)) {
      if (inThisGroupRoom) {
        useCallsStore.getState().setUiMode('full');
        return;
      }
      if (callBusy) {
        toast.error(t('messenger.calls.busyLocal'));
        return;
      }
      startCallInFlightRef.current = true;
      try {
        const fetched = await callsApi.getConversationActive(activeConversationId);
        const existingCall = fetched?.call;
        const existingId = existingCall?.id || groupRoom?.callId;
        if (existingCall) {
          useGroupRoomsStore.getState().upsertFromCall(existingCall);
        }
        if (existingId) {
          const ok = window.confirm(t('messenger.calls.groupJoinConfirm'));
          if (!ok) return;
          await joinConversationGroupRoom(existingId);
          return;
        }
        await startConversationCall(activeConversationId, mediaType, {
          group: true,
        });
      } catch (err) {
        if (err?.message === 'CALL_BUSY_LOCAL') {
          toast.error(t('messenger.calls.busyLocal'));
          return;
        }
        const code = getApiErrorCode(err);
        if (code === 'CALL_ROOM_ALREADY_ACTIVE') {
          const existingCall = err?.response?.data?.details?.call;
          if (existingCall?.id) {
            useGroupRoomsStore.getState().upsertFromCall(existingCall);
            const ok = window.confirm(t('messenger.calls.groupJoinConfirm'));
            if (ok) await joinConversationGroupRoom(existingCall.id);
          }
          return;
        }
        toast.error(getApiErrorMessage(err) || t('messenger.calls.startFailed'));
      } finally {
        startCallInFlightRef.current = false;
      }
      return;
    }
    if (callBusy) {
      toast.error(t('messenger.calls.busyLocal'));
      return;
    }
    startCallInFlightRef.current = true;
    try {
      await startConversationCall(activeConversationId, mediaType);
    } catch (err) {
      if (err?.message === 'CALL_BUSY_LOCAL') {
        toast.error(t('messenger.calls.busyLocal'));
        return;
      }
      const code = getApiErrorCode(err);
      if (code === 'VIP_CHAT_ACCESS_REQUIRED') {
        toast.error(t('messenger.calls.unavailableTitle'), {
          description: t('messenger.calls.vipRequired'),
        });
        return;
      }
      if (code === 'SUBSCRIPTION_REQUIRED') {
        toast.error(t('messenger.calls.unavailableTitle'), {
          description: t('messenger.calls.subscriptionRequired'),
        });
        return;
      }
      toast.error(getApiErrorMessage(err) || t('messenger.calls.startFailed'));
    } finally {
      startCallInFlightRef.current = false;
    }
  };

  const redialFromCallEvent = (message) => {
    if (!canRedialCallEvent(message)) return;
    const otherId = getCallRedialPeerId(message, currentUserId, peerId);
    if (!otherId) return;
    void startCall(getCallRedialMediaType(message));
  };

  const openChatMenu = useCallback((event, chat) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setChatMenu({
      chat,
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    });
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleChatMenuAction = useCallback(
    async (actionId) => {
      const chat = chatMenu?.chat;
      setChatMenu(null);
      if (!chat?.id) return;

      const chatId = chat.id;
      const peerUserId = chat.participant?.id;
      const muted = isConversationMuted(chat);

      try {
        if (actionId === 'pin') {
          const result = await conversationsApi.pinConversation(chatId);
          setConversations((prev) =>
            sortConversations(
              prev.map((c) =>
                String(c.id) === String(chatId)
                  ? {
                      ...c,
                      pinnedAt: result.pinnedAt,
                      isPinned: result.isPinned,
                    }
                  : c,
              ),
            ),
          );
          toast.success(
            result.isPinned
              ? t('messenger.chatMenu.pinSuccess')
              : t('messenger.chatMenu.unpinSuccess'),
          );
          return;
        }

        if (actionId === 'mute') {
          const mutedUntil = muted
            ? null
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          const result = await conversationsApi.muteConversation(chatId, mutedUntil);
          setConversations((prev) =>
            prev.map((c) =>
              String(c.id) === String(chatId)
                ? { ...c, mutedUntil: result.mutedUntil }
                : c,
            ),
          );
          setMutedOverrides((prev) => ({
            ...prev,
            [chatId]: !muted,
          }));
          toast.success(
            muted ? t('messenger.unmuteSuccess') : t('messenger.muteSuccess'),
          );
          return;
        }

        if (actionId === 'unread') {
          const pendingRead = readInFlightRef.current.get(String(chatId));
          if (pendingRead) await pendingRead;
          manuallyUnreadRef.current.add(String(chatId));
          let result;
          try {
            result = await conversationsApi.markConversationUnread(chatId);
          } catch (error) {
            manuallyUnreadRef.current.delete(String(chatId));
            throw error;
          }
          const unreadCount = Math.max(1, result?.unreadCount ?? 1);
          const patchUnread = (c) =>
            String(c.id) === String(chatId) ? { ...c, unreadCount } : c;
          setHiddenConversations((prev) => prev.map(patchUnread));
          setConversations((prev) => prev.map(patchUnread));
          if (typeof result?.totalUnreadCount === 'number') {
            setTotalUnreadCount(result.totalUnreadCount);
          } else {
            void fetchTotalUnreadCount(true);
          }
          toast.success(t('messenger.chatMenu.markUnreadSuccess'));
          return;
        }

        if (actionId === 'read') {
          await markChatRead(chatId, { force: true });
          toast.success(
            t('messenger.chatMenu.markReadSuccess', {
              defaultValue: 'Чат позначено як прочитаний',
            }),
          );
          return;
        }

        if (actionId === 'unhide') {
          const result = await conversationsApi.unhideConversation(chatId);
          const restored = {
            ...chat,
            ...(result && typeof result === 'object' ? result : {}),
            isHidden: false,
          };
          setHiddenConversations((prev) => {
            const next = prev.filter((c) => String(c.id) !== String(chatId));
            if (next.length === 0) setSidebarMode('inbox');
            return next;
          });
          setConversations((prev) => {
            if (prev.some((c) => String(c.id) === String(chatId))) {
              return sortConversations(prev);
            }
            return sortConversations([restored, ...prev]);
          });
          toast.success(t('messenger.chatMenu.unhideSuccess'));
          return;
        }

        if (actionId === 'block') {
          if (!peerUserId) return;
          const ok = window.confirm(t('messenger.chatMenu.blockConfirm'));
          if (!ok) return;
          await usersApi.blockUser(peerUserId);
          setConversations((prev) =>
            prev.filter((c) => String(c.id) !== String(chatId)),
          );
          setHiddenConversations((prev) =>
            prev.filter((c) => String(c.id) !== String(chatId)),
          );
          if (String(activeConversationId) === String(chatId)) {
            navigate('/messages');
          }
          void fetchTotalUnreadCount(true);
          toast.success(t('messenger.chatMenu.blockSuccess'));
          return;
        }

        if (actionId === 'delete') {
          const isGroup = isGroupConversation(chat);
          const ok = window.confirm(
            isGroup
              ? t('messenger.chatMenu.hideConfirm')
              : t('messenger.chatMenu.deleteConfirm'),
          );
          if (!ok) return;
          const result = await conversationsApi.deleteConversationForMe(chatId);
          setConversations((prev) =>
            prev.filter((c) => String(c.id) !== String(chatId)),
          );
          setHiddenConversations((prev) => {
            if (prev.some((c) => String(c.id) === String(chatId))) return prev;
            return sortConversations([
              {
                ...chat,
                isHidden: true,
                isPinned: false,
                pinnedAt: null,
              },
              ...prev,
            ]);
          });
          if (String(activeConversationId) === String(chatId)) {
            navigate('/messages');
          }
          if (typeof result.totalUnreadCount === 'number') {
            setTotalUnreadCount(result.totalUnreadCount);
          } else {
            void fetchTotalUnreadCount(true);
          }
          toast.success(
            isGroup
              ? t('messenger.chatMenu.hideSuccess')
              : t('messenger.chatMenu.deleteSuccess'),
          );
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'errors.generic'));
      }
    },
    [
      activeConversationId,
      chatMenu,
      fetchTotalUnreadCount,
      navigate,
      markChatRead,
      setTotalUnreadCount,
      t,
    ],
  );

  const openChatHeaderPeer = useCallback(() => {
    if (isActiveGroup) {
      setShowGroupInfo(true);
      return;
    }
    const username = resolveProfileUsername(activeConversation?.participant);
    if (!username) {
      toast.error(t('profile.friends.profileUnavailable'));
      return;
    }
    navigate(`/profile/${encodeURIComponent(username)}`);
  }, [activeConversation?.participant, isActiveGroup, navigate, t]);

  if (isAuthLoading || !isAuthed) return null;

  const showChatOnMobile = Boolean(activeConversationId);
  const peerName = getDisplayName(activeConversation?.participant, t('common.user'));

  return (
    <div className={`messagesPage${showChatOnMobile ? ' messagesPage--chatOpen' : ''}`}>
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

        <div
          className={`messagesPage__content${showChatOnMobile ? ' messagesPage__content--chatOpen' : ''}`}
        >
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

            <button
              type="button"
              className="messagesPage__createGroup"
              onClick={() => setShowCreateGroup(true)}
              aria-label={t('messenger.group.createAria')}
            >
              <span className="messagesPage__createGroupGlyph" aria-hidden="true">
                <GroupUsersIcon />
                <GroupCreatePlusIcon />
              </span>
              <span className="messagesPage__createGroupLabel">
                {t('messenger.group.create')}
              </span>
            </button>
          </div>

          <div className="messagesPage__body">
            <aside
              className={`messagesPage__sidebar${showChatOnMobile ? ' is-hidden-mobile' : ''}`}
            >
              {sidebarMode === 'hidden' ? (
                <div className="messagesPage__hiddenHead">
                  <button
                    type="button"
                    className="messagesPage__hiddenBack"
                    onClick={() => setSidebarMode('inbox')}
                    aria-label={t('messenger.hiddenChatsBack')}
                  >
                    <img src={profileIcons.arrowLeftBlack} alt="" />
                    <span>{t('messenger.hiddenChats')}</span>
                  </button>
                </div>
              ) : null}
              {(sidebarMode === 'hidden'
                ? loadingHidden
                : loadingList && conversations.length === 0) && (
                <p className="messagesPage__hint">{t('common.loading')}</p>
              )}
              {sidebarMode === 'inbox' && !loadingList && listError && (
                <p className="messagesPage__hint messagesPage__hint--error">{listError}</p>
              )}
              {sidebarMode === 'inbox' &&
                !loadingList &&
                !listError &&
                filteredConversations.length === 0 &&
                hiddenConversations.length === 0 && (
                <p className="messagesPage__hint">{t('messenger.noChats')}</p>
              )}
              {sidebarMode === 'hidden' &&
                !loadingHidden &&
                filteredHiddenConversations.length === 0 && (
                <p className="messagesPage__hint">{t('messenger.hiddenChatsEmpty')}</p>
              )}

              <ul className="messagesPage__chatList" ref={chatListScrollRef}>
                {sidebarMode === 'inbox' &&
                loadingList &&
                conversations.length === 0
                  ? Array.from({ length: 4 }, (_, i) => (
                      <li
                        key={`chat-skel-${i}`}
                        className="messagesPage__chatRow messagesPage__chatRow--skeleton"
                        aria-hidden="true"
                      >
                        <div className="messagesPage__chatSkeleton" />
                      </li>
                    ))
                  : null}
                {sidebarMode === 'inbox' && hiddenConversations.length > 0 ? (
                  <li className="messagesPage__chatRow">
                    <button
                      type="button"
                      className="messagesPage__chatItem messagesPage__hiddenFolder"
                      onClick={() => setSidebarMode('hidden')}
                      aria-label={t('messenger.hiddenChatsOpen')}
                    >
                      <div className="messagesPage__chatAvatar messagesPage__hiddenFolderIcon">
                        <LuEyeOff aria-hidden="true" />
                      </div>
                      <div className="messagesPage__chatMeta">
                        <div className="messagesPage__chatTop">
                          <span className="messagesPage__chatName">
                            {t('messenger.hiddenChats')}
                          </span>
                          <span className="messagesPage__hiddenCount">
                            {hiddenConversations.length}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ) : null}
                {sidebarConversations.map((chat) => {
                  const isActive = chat.id === activeConversationId;
                  const isGroup = isGroupConversation(chat);
                  const name = isGroup
                    ? getConversationTitle(chat, t('messenger.group.untitled'))
                    : getDisplayName(chat.participant, t('common.user'));
                  const preview = getConversationListPreview(
                    chat,
                    t,
                    currentUserId,
                    drafts,
                  );
                  const chatMuted = isConversationMuted(chat);
                  const chatPinned = Boolean(chat.isPinned || chat.pinnedAt);
                  const groupTime = isGroup
                    ? formatConversationClock(
                        chat.lastMessage?.createdAt || chat.updatedAt,
                      )
                    : '';
                  return (
                    <li key={chat.id} className="messagesPage__chatRow">
                      <Link
                        to={`/messages/${chat.id}`}
                        className={`messagesPage__chatItem${isActive ? ' is-active' : ''}${chatPinned ? ' is-pinned' : ''}`}
                        onContextMenu={(e) => openChatMenu(e, chat)}
                        onTouchStart={(e) => {
                          clearLongPress();
                          const target = e.currentTarget;
                          longPressTimerRef.current = setTimeout(() => {
                            const rect = target.getBoundingClientRect();
                            setChatMenu({
                              chat,
                              anchorRect: {
                                top: rect.top,
                                left: rect.left,
                                right: rect.right,
                                bottom: rect.bottom,
                                width: rect.width,
                                height: rect.height,
                              },
                            });
                          }, 480);
                        }}
                        onTouchEnd={clearLongPress}
                        onTouchMove={clearLongPress}
                        onTouchCancel={clearLongPress}
                      >
                        <div className="messagesPage__chatAvatar">
                          {isGroup ? (
                            <GroupAvatar src={chat.avatarUrl} name={name} />
                          ) : chat.participant?.avatarUrl ? (
                            <img src={chat.participant.avatarUrl} alt="" />
                          ) : (
                            <span>{name.charAt(0).toUpperCase()}</span>
                          )}
                          {!isGroup ? (
                            <OnlineStatus
                              userId={chat.participant?.id}
                              user={chat.participant}
                              className="onlineStatus--onAvatar"
                            />
                          ) : null}
                        </div>
                        <div className="messagesPage__chatMeta">
                          <div className="messagesPage__chatTop">
                            <span className="messagesPage__chatName">
                              {chatPinned ? (
                                <span className="messagesPage__pinMark" aria-hidden="true">
                                  📌
                                </span>
                              ) : null}
                              {name}
                              {chatMuted ? (
                                <span className="messagesPage__muteMark" aria-hidden="true">
                                  🔕
                                </span>
                              ) : null}
                            </span>
                            <span className="messagesPage__chatTopRight">
                              {groupTime ? (
                                <time className="messagesPage__chatTime">{groupTime}</time>
                              ) : null}
                              {chat.unreadCount > 0 ? (
                                <span className="messagesPage__unread">{chat.unreadCount}</span>
                              ) : null}
                            </span>
                          </div>
                          <p
                            className={`messagesPage__chatPreview${preview.isDraft ? ' is-draft' : ''}`}
                          >
                            {preview.isDraft ? (
                              <>
                                <span className="messagesPage__draftLabel">
                                  {t('messenger.draftLabel')}
                                </span>{' '}
                                {preview.draftText}
                              </>
                            ) : (
                              preview.text
                            )}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className="messagesPage__chatMenuBtn"
                        aria-label={t('messenger.chatMenu.open')}
                        onClick={(e) => openChatMenu(e, chat)}
                      >
                        ⋯
                      </button>
                    </li>
                  );
                })}
                {sidebarMode === 'inbox' && listHasMore ? (
                  <li
                    ref={listLoadMoreSentinelRef}
                    className="messagesPage__listSentinel"
                    aria-hidden="true"
                  />
                ) : null}
                {sidebarMode === 'inbox' && loadingMoreList ? (
                  <li className="messagesPage__chatRow messagesPage__chatRow--skeleton" aria-hidden="true">
                    <div className="messagesPage__chatSkeleton messagesPage__chatSkeleton--short" />
                  </li>
                ) : null}
              </ul>
              {sidebarMode === 'inbox' &&
              !isMobileListViewport &&
              listHasMore &&
              !serverSearchActive &&
              searchQuery.trim().length < 2 ? (
                <button
                  type="button"
                  className="messagesPage__listLoadMore"
                  disabled={loadingMoreList}
                  onClick={() => void loadMoreConversations()}
                >
                  {loadingMoreList
                    ? t('messenger.loadingMoreChats')
                    : t('messenger.showMoreChats')}
                </button>
              ) : null}
            </aside>

            <section
              className={`messagesPage__chat${!showChatOnMobile ? ' is-hidden-mobile' : ''}`}
            >
              {!activeConversationId && (
                <div className="messagesPage__emptyChat">
                  <img
                    src="/messages/messages-empty-chat.png"
                    alt=""
                    className="messagesPage__emptyArt"
                    aria-hidden="true"
                  />
                  <div className="messagesPage__emptyCopy">
                    <h2 className="messagesPage__emptyTitle">
                      {t('messenger.empty.title')}
                    </h2>
                    <p className="messagesPage__emptyDesc">
                      {t('messenger.empty.description')}
                    </p>
                  </div>
                  <ul className="messagesPage__emptyFeatures">
                    <li>
                      <span className="messagesPage__emptyFeatureIcon" aria-hidden="true">
                        <img src={profileIcons.comments} alt="" />
                      </span>
                      <strong>{t('messenger.empty.communicate')}</strong>
                      <span>{t('messenger.empty.communicateHint')}</span>
                    </li>
                    <li>
                      <span className="messagesPage__emptyFeatureIcon" aria-hidden="true">
                        <img src={profileIcons.friends} alt="" />
                      </span>
                      <strong>{t('messenger.empty.createGroups')}</strong>
                      <span>{t('messenger.empty.createGroupsHint')}</span>
                    </li>
                    <li>
                      <span className="messagesPage__emptyFeatureIcon" aria-hidden="true">
                        <img src={profileIcons.like} alt="" />
                      </span>
                      <strong>{t('messenger.empty.closer')}</strong>
                      <span>{t('messenger.empty.closerHint')}</span>
                    </li>
                  </ul>
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
                    <div className="messagesPage__chatHeadPeer">
                      <button
                        type="button"
                        className={`messagesPage__chatHeadButton${isActiveGroup ? ' is-group' : ' is-peerProfile'}`}
                        onClick={openChatHeaderPeer}
                        aria-label={
                          isActiveGroup
                            ? t('messenger.group.info')
                            : t('profile.friends.openProfile', { name: chatTitle })
                        }
                      >
                      <div className="messagesPage__chatHeadAvatar" aria-hidden="true">
                        {isActiveGroup ? (
                          <GroupAvatar
                            src={activeConversation?.avatarUrl}
                            name={chatTitle}
                          />
                        ) : activeConversation?.participant?.avatarUrl ? (
                          <img src={activeConversation.participant.avatarUrl} alt="" />
                        ) : (
                          <span>{chatTitle.charAt(0).toUpperCase()}</span>
                        )}
                        {!isActiveGroup ? (
                          <OnlineStatus
                            userId={activeConversation?.participant?.id}
                            user={activeConversation?.participant}
                            className="onlineStatus--onAvatar"
                          />
                        ) : null}
                      </div>
                      <div className="messagesPage__chatHeadPresence">
                        <h2 className="messagesPage__chatTitle">{chatTitle}</h2>
                        {isActiveGroup ? (
                          <p className="messagesPage__chatSubtitle">
                            {t('messenger.group.membersCount', {
                              count:
                                activeConversation?.memberCount ||
                                activeConversation?.members?.length ||
                                0,
                            })}
                          </p>
                        ) : (
                          <OnlineStatus
                            userId={activeConversation?.participant?.id}
                            user={activeConversation?.participant}
                            variant="label"
                          />
                        )}
                      </div>
                      </button>
                    </div>
                    <div className="messagesPage__chatActions">
                      <button
                        type="button"
                        className="messagesPage__chatAction"
                        onClick={() => void startCall('AUDIO')}
                        disabled={callBusy && !inThisGroupRoom}
                        aria-label={t('messenger.calls.audioCall')}
                        title={t('messenger.calls.audioCall')}
                      >
                        📞
                      </button>
                      <button
                        type="button"
                        className="messagesPage__chatAction"
                        onClick={() => void startCall('VIDEO')}
                        disabled={callBusy && !inThisGroupRoom}
                        aria-label={t('messenger.calls.videoCall')}
                        title={t('messenger.calls.videoCall')}
                      >
                        🎥
                      </button>
                      <button
                        type="button"
                        className={`messagesPage__chatAction messagesPage__chatAction--search${showChatSearch ? ' is-active' : ''}`}
                        onClick={() => setShowChatSearch((v) => !v)}
                        aria-label={t('messenger.searchInChat')}
                      >
                        <img src={profileIcons.searchMagnifier} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`messagesPage__chatAction messagesPage__chatAction--mute${isMuted ? ' is-active' : ''}`}
                        onClick={() => void toggleMute()}
                        aria-label={isMuted ? t('messenger.unmuteChat') : t('messenger.muteChat')}
                      >
                        {isMuted ? '🔕' : '🔔'}
                      </button>
                    </div>
                  </header>

                  {isActiveGroup && groupRoom ? (
                    <div className="messagesPage__groupRoom">
                      <div className="messagesPage__groupRoomCopy">
                        <strong>
                          {groupRoom.mediaType === 'VIDEO'
                            ? t('messenger.calls.groupVideoRoom')
                            : t('messenger.calls.groupAudioRoom')}
                        </strong>
                        <span>
                          {t('messenger.calls.groupParticipantsNow', {
                            count: groupRoom.participantCount || 0,
                          })}
                        </span>
                      </div>
                      {inThisGroupRoom ? (
                        <button
                          type="button"
                          className="messagesPage__groupRoomJoin"
                          onClick={() => useCallsStore.getState().setUiMode('full')}
                        >
                          {t('messenger.calls.returnToRoom')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="messagesPage__groupRoomJoin"
                          onClick={() => {
                            if (callBusy) {
                              toast.error(t('messenger.calls.busyLocal'));
                              return;
                            }
                            void joinConversationGroupRoom(groupRoom.callId).catch(
                              (err) => {
                                toast.error(
                                  getApiErrorMessage(err) ||
                                    t('messenger.calls.startFailed'),
                                );
                              },
                            );
                          }}
                        >
                          {t('messenger.calls.joinRoom')}
                        </button>
                      )}
                    </div>
                  ) : null}

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

                  <div className="messagesPage__messages" ref={messagesScrollRef}>
                    {loadingOlder ? (
                      <p className="messagesPage__hint">{t('common.loading')}</p>
                    ) : null}
                    {loadingChat && messages.length === 0 ? (
                      <p className="messagesPage__hint">{t('common.loading')}</p>
                    ) : null}
                    {(messages.length > 0 || !loadingChat) &&
                      groupedMessages.map((item) => {
                        if (item.type === 'date') {
                          return (
                            <div key={item.id} className="messagesPage__dateSep">
                              {item.label}
                            </div>
                          );
                        }
                        const msg = item.message;
                        if (msg.type === 'CALL_EVENT') {
                          const canRedial = canRedialCallEvent(msg);
                          const redialType = getCallRedialMediaType(msg);
                          const redialLabel =
                            redialType === 'VIDEO'
                              ? t('messenger.calls.redialVideo')
                              : t('messenger.calls.redialAudio');
                          const clock = getCallEventClock(msg);
                          return (
                            <div key={msg.id} className="messagesPage__callEventBlock">
                              {clock ? (
                                <div className="messagesPage__callEventTime">{clock}</div>
                              ) : null}
                              <button
                                type="button"
                                className="messagesPage__callEvent"
                                onClick={() => redialFromCallEvent(msg)}
                                disabled={!canRedial || callBusy}
                                aria-label={redialLabel}
                                title={redialLabel}
                              >
                                <span className="messagesPage__callEventIcon" aria-hidden="true">
                                  {getCallEventIcon(msg)}
                                </span>
                                <span className="messagesPage__callEventText">
                                  {formatCallEventLabel(msg, t, currentUserId)}
                                </span>
                              </button>
                            </div>
                          );
                        }
                        const isMine = msg.senderId === currentUserId;
                        const peer = activeConversation?.participant;
                        const senderName = isActiveGroup
                          ? getMessageSenderName(
                              msg,
                              activeConversation?.members,
                              t('common.user'),
                            )
                          : getDisplayName(peer, t('common.user'));
                        const senderAvatar = isActiveGroup
                          ? msg.sender?.avatarUrl ||
                            activeConversation?.members?.find(
                              (m) => String(m.id) === String(msg.senderId),
                            )?.avatarUrl
                          : peer?.avatarUrl;
                        const storyAuthorFallback = isMine
                          ? {
                              id: peer?.id,
                              username: peer?.username,
                              name: getDisplayName(peer, t('common.user')),
                              avatarUrl: peer?.avatarUrl,
                            }
                          : {
                              id: currentUser?.id,
                              username: currentUser?.username,
                              name: getDisplayName(currentUser, t('common.user')),
                              avatarUrl: currentUser?.avatarUrl,
                            };
                        return (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isMine={isMine}
                            currentUserId={currentUserId}
                            conversationId={activeConversationId}
                            peerAvatarUrl={senderAvatar}
                            peerName={senderName}
                            showSenderName={isActiveGroup}
                            hideReadReceipt={isActiveGroup}
                            highlight={String(msg.id) === String(highlightMessageId)}
                            onOpenMenu={(message, rect, bubbleTimeLabel, isMineBubble) => {
                              if (message?.pending) return;
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
                            onOpenStory={(preview) => {
                              const group = buildStoryViewerGroup(preview, storyAuthorFallback);
                              if (group) setStoryViewerGroup(group);
                            }}
                            storyAuthorFallback={storyAuthorFallback.name || storyAuthorFallback.username}
                            seenMessageIds={seenMessageIds}
                          />
                        );
                      })}
                    {(() => {
                      const visibleTypingIds = isActiveGroup
                        ? typingUserIds
                        : typingUserIds.filter((id) => String(id) === String(peerId));
                      if (!visibleTypingIds.length) return null;
                      const typingName = isActiveGroup
                        ? getMessageSenderName(
                            { senderId: visibleTypingIds[0] },
                            activeConversation?.members,
                            t('common.user'),
                          )
                        : peerName;
                      return <TypingIndicator peerName={typingName} />;
                    })()}
                    <div ref={messagesEndRef} />
                  </div>

                  <MessageComposer
                    value={getConversationDraft(drafts, activeConversationId)}
                    onChange={handleDraftChange}
                    onSendPayload={handleSendPayload}
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

      <ChatContextMenu
        isOpen={Boolean(chatMenu)}
        anchorRect={chatMenu?.anchorRect}
        isPinned={Boolean(chatMenu?.chat?.isPinned || chatMenu?.chat?.pinnedAt)}
        isMuted={isConversationMuted(chatMenu?.chat)}
        isGroup={isGroupConversation(chatMenu?.chat)}
        isHidden={Boolean(
          chatMenu?.chat?.isHidden || sidebarMode === 'hidden',
        )}
        isUnread={Number(chatMenu?.chat?.unreadCount) > 0}
        onClose={() => setChatMenu(null)}
        onAction={handleChatMenuAction}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        currentUserId={currentUserId}
        onClose={() => setShowCreateGroup(false)}
        onCreated={(created) => {
          if (!created?.id) return;
          setConversations((prev) => {
            const rest = prev.filter((c) => String(c.id) !== String(created.id));
            return sortConversations([created, ...rest]);
          });
          navigate(`/messages/${created.id}`);
        }}
      />

      <GroupInfoModal
        isOpen={showGroupInfo && isActiveGroup}
        conversation={activeConversation}
        currentUserId={currentUserId}
        onClose={() => setShowGroupInfo(false)}
        onUpdated={(updated) => {
          if (!updated?.id) return;
          setConversations((prev) =>
            prev.map((c) =>
              String(c.id) === String(updated.id) ? { ...c, ...updated } : c,
            ),
          );
        }}
        onLeft={(leftId) => {
          setConversations((prev) =>
            prev.filter((c) => String(c.id) !== String(leftId)),
          );
          if (String(activeConversationId) === String(leftId)) {
            navigate('/messages');
          }
        }}
        onDeleted={(deletedId) => {
          setConversations((prev) =>
            prev.filter((c) => String(c.id) !== String(deletedId)),
          );
          setShowGroupInfo(false);
          if (String(activeConversationId) === String(deletedId)) {
            setMessages([]);
            navigate('/messages');
          }
          void fetchTotalUnreadCount(true);
        }}
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

      <StoryViewerModal
        isOpen={Boolean(storyViewerGroup)}
        groups={storyViewerGroup ? [storyViewerGroup] : []}
        initialGroupIndex={0}
        initialStoryIndex={0}
        currentUserId={currentUserId}
        onClose={() => setStoryViewerGroup(null)}
        onOpenProfile={(username) => {
          if (username) navigate(`/profile/${username}`);
        }}
      />
    </div>
  );
}
