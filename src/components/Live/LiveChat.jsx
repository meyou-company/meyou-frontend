import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { REACTIONS } from "./LiveStage";
import profileIcons from "../../constants/profileIcons";

const LiveChat = forwardRef(function LiveChat(
  {
    isOwner,
    currentUser,
    messages,
    pinnedMessageIds,
    isEnded,
    hasOlderMessages,
    isLoadingOlderMessages,
    onSend,
    onLoadOlder,
    onPin,
    onDelete,
    onReply,
    onModerate,
    onOpenProfile,
    blockedUserIds,
    moderatingUserId,
  },
  ref,
) {
  const [value, setValue] = useState("");
  const [menuMessageId, setMenuMessageId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const hasPositionedMessagesRef = useRef(false);
  const pinnedIds = useMemo(() => new Set(pinnedMessageIds), [pinnedMessageIds]);
  const groupedMessages = useMemo(() => {
    const pinned = [];
    const regular = [];
    messages.forEach((message) => {
      if (pinnedIds.has(message.id) || message.isPinned) pinned.push(message);
      else regular.push(message);
    });
    return { pinned, regular };
  }, [messages, pinnedIds]);
  const latestMessageId = messages.at(-1)?.id;

  useEffect(() => {
    if (!menuMessageId) return undefined;

    const closeMenu = () => {
      setMenuMessageId(null);
      setMenuPosition(null);
    };

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    document.addEventListener("touchmove", closeMenu, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      document.removeEventListener("touchmove", closeMenu, true);
    };
  }, [menuMessageId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (!hasPositionedMessagesRef.current || shouldStickToBottomRef.current) {
      window.requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        shouldStickToBottomRef.current = true;
        hasPositionedMessagesRef.current = true;
      });
    }
  }, [latestMessageId, messages.length]);

  const handleMessagesScroll = (event) => {
    const container = event.currentTarget;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom <= 48;
  };

  const handleLoadOlder = async () => {
    const container = messagesContainerRef.current;
    if (!container || !onLoadOlder || isLoadingOlderMessages) return;
    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;
    shouldStickToBottomRef.current = false;
    await onLoadOlder();
    window.requestAnimationFrame(() => {
      const addedHeight = container.scrollHeight - previousScrollHeight;
      container.scrollTop = previousScrollTop + Math.max(0, addedHeight);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalized = value.trim();
    if (!normalized || isEnded) return;

    try {
      shouldStickToBottomRef.current = true;
      await onSend(normalized);
      setValue("");
    } catch {
      // Parent displays the user-facing error.
    }
  };

  const handleReply = (message) => {
    setValue(`@${message.authorName} `);
    setMenuMessageId(null);
    onReply?.(message);
    inputRef.current?.focus();
  };

  const handleInsertReaction = (reaction) => {
    setValue((current) => `${current}${reaction.value}`.slice(0, 300));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const renderMessage = (message) => (
    <article
      key={message.id}
      className={`liveChat__message ${pinnedIds.has(message.id) || message.isPinned ? "liveChat__message--pinned" : ""}`}
    >
      {(pinnedIds.has(message.id) || message.isPinned) && (
        <span className="liveChat__pin" aria-label="Закреплено">📌</span>
      )}
      <button
        type="button"
        className="liveChat__avatarButton"
        onClick={() => onOpenProfile?.(message)}
        aria-label={`Открыть профиль ${message.authorName}`}
      >
        <img src={message.avatar} alt="" />
      </button>
      <div className="liveChat__messageContent">
        <button
          type="button"
          className="liveChat__author"
          onClick={() => onOpenProfile?.(message)}
        >
          {message.authorName}
        </button>
        <p>{message.text}</p>
      </div>

      {isOwner && (
        <div className="liveChat__messageMenuWrap">
          <button
            type="button"
            className="liveChat__messageMenuButton"
            onClick={(event) => {
              if (menuMessageId === message.id) {
                setMenuMessageId(null);
                setMenuPosition(null);
                return;
              }
              const rect = event.currentTarget.getBoundingClientRect();
              const menuWidth = 132;
              setMenuPosition({
                top: rect.bottom + 2,
                left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth)),
              });
              setMenuMessageId(message.id);
            }}
            aria-label="Действия с сообщением"
            aria-expanded={menuMessageId === message.id}
          >
            ⋮
          </button>

          {menuMessageId === message.id && (
            <div className="liveChat__messageMenu" style={menuPosition || undefined}>
              {message.authorId && String(message.authorId) !== String(currentUser.id) && (
                <>
                  <button
                    type="button"
                    disabled={String(moderatingUserId || "") === String(message.authorId)}
                    onClick={() => {
                      const isBlocked = blockedUserIds?.has(String(message.authorId));
                      onModerate(isBlocked ? "unblock" : "block", message);
                      setMenuMessageId(null);
                    }}
                  >
                    {blockedUserIds?.has(String(message.authorId))
                      ? "Разблокировать"
                      : "Заблокировать"}
                  </button>
                  <button
                    type="button"
                    disabled={String(moderatingUserId || "") === String(message.authorId)}
                    onClick={() => {
                      onModerate("report", message);
                      setMenuMessageId(null);
                    }}
                  >
                    Пожаловаться
                  </button>
                </>
              )}
              <button type="button" onClick={() => {
                onPin(message);
                setMenuMessageId(null);
              }}>
                {pinnedIds.has(message.id) || message.isPinned ? "Открепить" : "Закрепить"}
              </button>
              <button type="button" onClick={() => handleReply(message)}>Ответить</button>
              <button type="button" onClick={() => {
                onDelete(message);
                setMenuMessageId(null);
              }}>
                Удалить
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );

  return (
    <section className="liveChat" ref={ref}>
      <header className="liveChat__header">
        <img className="liveChat__headerIcon" src={profileIcons.liveChat} alt="" />
        <h2>Чат</h2>
      </header>

      {groupedMessages.pinned.length > 0 && (
        <div className="liveChat__pinnedMessages">
          {groupedMessages.pinned.map(renderMessage)}
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="liveChat__messages"
        onScroll={handleMessagesScroll}
      >
        {hasOlderMessages && (
          <button
            type="button"
            className="liveChat__loadOlder"
            onClick={handleLoadOlder}
            disabled={isLoadingOlderMessages}
          >
            {isLoadingOlderMessages ? "Загрузка..." : "Показать предыдущие комментарии"}
          </button>
        )}
        {groupedMessages.regular.map(renderMessage)}
      </div>

      <footer className="liveChat__footer">
        <form className="liveChat__composer" onSubmit={handleSubmit}>
          <img src={currentUser.avatar} alt="" />
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={isEnded ? "Эфир завершён" : "Написать сообщение"}
            maxLength={300}
            disabled={isEnded}
            aria-label="Сообщение в чат"
          />
          <button
            type="submit"
            disabled={!value.trim() || isEnded}
            aria-label="Отправить сообщение"
          >
            <img src={profileIcons.liveSend} alt="" />
          </button>
        </form>

        {!isOwner && !isEnded && (
          <div className="liveChat__quickReactions">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.value}
                type="button"
                onClick={() => handleInsertReaction(reaction)}
                aria-label={`Добавить реакцию ${reaction.label} в сообщение`}
              >
                {reaction.icon
                  ? <img src={reaction.icon} alt="" />
                  : <span aria-hidden="true">{reaction.content}</span>}
              </button>
            ))}
          </div>
        )}
      </footer>
    </section>
  );
});

export default LiveChat;
