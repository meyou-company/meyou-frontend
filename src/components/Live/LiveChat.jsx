import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { REACTIONS } from "./LiveStage";

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
      <img src={message.avatar} alt="" />
      <div className="liveChat__messageContent">
        <span className="liveChat__author">{message.authorName}</span>
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
              {String(message.authorId) !== String(currentUser.id) && (
                <>
                  <button type="button" onClick={() => {
                    onModerate("block", message);
                    setMenuMessageId(null);
                  }}>
                    Заблокировать
                  </button>
                  <button type="button" onClick={() => {
                    onModerate("report", message);
                    setMenuMessageId(null);
                  }}>
                    Пожаловаться
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );

  return (
    <section className="liveChat" ref={ref}>
      <header className="liveChat__header">
        <span className="liveChat__headerIcon" aria-hidden="true" />
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
            ➤
          </button>
        </form>

        {!isOwner && !isEnded && (
          <div className="liveChat__quickReactions">
            {REACTIONS.slice(0, 3).map((reaction) => (
              <button
                key={reaction}
                type="button"
                onClick={() => onReact(reaction)}
                aria-label={`Отправить реакцию ${reaction}`}
              >
                {reaction}
              </button>
            ))}
          </div>
        )}
      </footer>
    </section>
  );
});

export default LiveChat;
