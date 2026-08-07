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
    onSend,
    onReact,
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
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pinnedIds = useMemo(() => new Set(pinnedMessageIds), [pinnedMessageIds]);
  const groupedMessages = useMemo(() => {
    const pinned = [];
    const regular = [];
    messages.forEach((message) => {
      if (pinnedIds.has(message.id)) pinned.push(message);
      else regular.push(message);
    });
    return { pinned, regular };
  }, [messages, pinnedIds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalized = value.trim();
    if (!normalized || isEnded) return;

    try {
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

  const renderMessage = (message) => (
    <article
      key={message.id}
      className={`liveChat__message ${pinnedIds.has(message.id) ? "liveChat__message--pinned" : ""}`}
    >
      {pinnedIds.has(message.id) && (
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
            onClick={() => setMenuMessageId((current) =>
              current === message.id ? null : message.id
            )}
            aria-label="Действия с сообщением"
            aria-expanded={menuMessageId === message.id}
          >
            ⋮
          </button>

          {menuMessageId === message.id && (
            <div className="liveChat__messageMenu">
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
                onPin(message.id);
                setMenuMessageId(null);
              }}>
                {pinnedIds.has(message.id) ? "Открепить" : "Закрепить"}
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

      <div className="liveChat__messages">
        {groupedMessages.pinned.length > 0 && (
          <div className="liveChat__pinnedMessages">
            {groupedMessages.pinned.map(renderMessage)}
          </div>
        )}
        {groupedMessages.regular.map(renderMessage)}
        <div ref={messagesEndRef} />
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
                onClick={() => onReact(reaction.value)}
                aria-label={`Отправить реакцию ${reaction.label}`}
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
