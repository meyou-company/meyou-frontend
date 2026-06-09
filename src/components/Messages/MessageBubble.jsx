import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyReactionEmoji } from '../../constants/messageReactions';
import MessageAttachments from './MessageAttachments';
import MessageReactionBar from './MessageReactionBar';
import './MessageBubble.scss';

const LONG_PRESS_MS = 500;

function ReadReceipt({ deliveryStatus, readAt }) {
  const seen = deliveryStatus === 'SEEN' || Boolean(readAt);

  return (
    <span className={`msgBubble__checks${seen ? ' is-read' : ''}`} aria-hidden="true">
      {seen ? '✓✓' : '✓'}
    </span>
  );
}

function aggregateReactions(reactions = []) {
  const counts = new Map();
  for (const r of reactions) {
    const emoji = r.emoji;
    if (!emoji) continue;
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  }
  return [...counts.entries()].map(([emoji, count]) => ({ emoji, count }));
}

export default function MessageBubble({
  message,
  isMine,
  currentUserId,
  peerAvatarUrl,
  peerName = '',
  onOpenMenu,
  onReactionSelect,
  highlight = false,
}) {
  const { t } = useTranslation();
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const replyTo = message.replyTo;
  const deletedForEveryone = message.deletedForEveryone === true;
  const myReaction = getMyReactionEmoji(message.reactions, currentUserId);
  const reactionSummary = aggregateReactions(message.reactions || []);

  const timeLabel = (() => {
    if (!message.createdAt) return '';
    try {
      return new Date(message.createdAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  const openMenu = (target) => {
    const rect = target.getBoundingClientRect();
    onOpenMenu?.(message, rect, timeLabel, isMine);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (e) => {
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openMenu(e.currentTarget);
    }, LONG_PRESS_MS);
  };

  const handleBubbleClick = (e) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    openMenu(e.currentTarget);
  };

  const peerInitial = peerName.charAt(0).toUpperCase() || '?';

  const replyLabel = replyTo?.deleted
    ? t('messenger.deletedMessage')
    : replyTo?.text || t('messenger.attachmentPreview');

  return (
    <div
      className={`msgBubbleRow${isMine ? ' is-mine' : ' is-theirs'}${highlight ? ' is-highlight' : ''}`}
      data-message-id={message.id}
    >
      {!isMine ? (
        <div className="msgBubbleRow__avatar" aria-hidden="true">
          {peerAvatarUrl ? (
            <img src={peerAvatarUrl} alt="" />
          ) : (
            <span>{peerInitial}</span>
          )}
        </div>
      ) : null}

      <div className="msgBubbleRow__content">
        {showReactions && !deletedForEveryone ? (
          <MessageReactionBar
            className="msgBubbleRow__reactions"
            selectedEmoji={myReaction}
            onSelect={(emoji) => {
              onReactionSelect?.(message, emoji);
              setShowReactions(false);
            }}
          />
        ) : null}

        <div
          className={`msgBubble${isMine ? ' msgBubble--mine' : ' msgBubble--theirs'}`}
          onClick={handleBubbleClick}
          onMouseDown={startLongPress}
          onMouseUp={clearLongPress}
          onMouseLeave={() => {
            clearLongPress();
            setShowReactions(false);
          }}
          onTouchStart={startLongPress}
          onTouchEnd={clearLongPress}
          onTouchMove={clearLongPress}
          onMouseEnter={() => !isMine && !deletedForEveryone && setShowReactions(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBubbleClick(e);
            }
          }}
        >
          {replyTo ? (
            <div className="msgBubble__reply">
              <span className="msgBubble__replyLabel">
                {isMine ? t('messenger.youReplied') : t('messenger.repliedTo')}
              </span>
              <p className="msgBubble__replyQuote">{replyLabel}</p>
            </div>
          ) : null}

          {message.forwardedFrom ? (
            <span className="msgBubble__forwarded">{t('messenger.forwarded')}</span>
          ) : null}

          {deletedForEveryone ? (
            <p className="msgBubble__text msgBubble__text--deleted">{t('messenger.deletedMessage')}</p>
          ) : (
            <>
              <MessageAttachments attachments={message.attachments} isMine={isMine} />
              {message.text ? <p className="msgBubble__text">{message.text}</p> : null}
            </>
          )}

          <div className="msgBubble__footer">
            {reactionSummary.length > 0 ? (
              <span className="msgBubble__reactions">
                {reactionSummary.map(({ emoji, count }) => (
                  <span key={emoji} className="msgBubble__reactionChip">
                    {emoji}
                    {count > 1 ? <span className="msgBubble__reactionCount">{count}</span> : null}
                  </span>
                ))}
              </span>
            ) : null}
            {message.editedAt ? (
              <span className="msgBubble__edited">{t('messenger.edited')}</span>
            ) : null}
            <time className="msgBubble__time" dateTime={message.createdAt || undefined}>
              {timeLabel}
            </time>
            {isMine ? (
              <ReadReceipt
                deliveryStatus={message.deliveryStatus}
                readAt={message.readAt}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
