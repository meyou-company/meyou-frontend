import { forwardRef, useEffect, useRef, useState } from "react";
import { REACTIONS } from "./LiveStage";

const LiveChat = forwardRef(function LiveChat(
  {
    isOwner,
    currentUser,
    messages,
    pinnedMessageId,
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

  return (
    <section className="liveChat" ref={ref}>
      <header className="liveChat__header">
        <span className="liveChat__headerIcon" aria-hidden="true" />
        <h2>Чат</h2>
      </header>

      <div className="liveChat__messages">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`liveChat__message ${message.id === pinnedMessageId ? "liveChat__message--pinned" : ""}`}
          >
            {message.id === pinnedMessageId && (
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
                      {message.id === pinnedMessageId ? "Открепить" : "Закрепить"}
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
        ))}
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
