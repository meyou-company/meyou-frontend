import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyReactionEmoji } from '../../constants/messageReactions';
import { isMessageSeenByPeer } from '../../utils/messageReadReceipt';
import { isEmojiOnlyMessage, splitMessageTextWithEmoji } from '../../utils/messageTextDisplay';
import { getStoryReplyPreview } from '../../utils/storyMessagePreview';
import MessageAttachments from './MessageAttachments';
import MessageReactionBar from './MessageReactionBar';
import './MessageBubble.scss';

const LONG_PRESS_MS = 500;
const REACTION_HIDE_DELAY_MS = 400;

function ReadReceipt({ isSeen }) {
  return (
    <span className={`msgBubble__checks${isSeen ? ' is-read' : ''}`} aria-hidden="true">
      {isSeen ? '✓✓' : '✓'}
    </span>
  );
}

function MessageText({ text }) {
  if (!text) return null;

  const emojiOnly = isEmojiOnlyMessage(text);
  const className = `msgBubble__text${emojiOnly ? ' msgBubble__text--emojiOnly' : ''}`;

  if (emojiOnly) {
    return <p className={className}>{text}</p>;
  }

  const parts = splitMessageTextWithEmoji(text);
  const hasEmoji = parts.some((part) => part.type === 'emoji');

  if (!hasEmoji) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.type === 'emoji' ? (
          <span key={`${index}-${part.value}`} className="msgBubble__emoji">
            {part.value}
          </span>
        ) : (
          part.value
        ),
      )}
    </p>
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

function getStoryAuthorLabel(preview, fallback) {
  const author = preview?.author || {};
  const name = author.username || author.name || [author.firstName, author.lastName].filter(Boolean).join(' ');
  return name || fallback;
}

function StoryReplyPreview({ preview, onOpenStory, authorFallback }) {
  const { t } = useTranslation();
  if (!preview) return null;

  const authorLabel = getStoryAuthorLabel(
    preview,
    authorFallback || t('messenger.storyAuthorFallback', { defaultValue: 'Story author' }),
  );

  if (preview.isUnavailable) {
    return (
      <div className="msgBubble__storyPreview msgBubble__storyPreview--unavailable">
        <span className="msgBubble__storyThumb msgBubble__storyThumb--unavailable" aria-hidden="true">
          <span className="msgBubble__storyThumbPlaceholder" />
        </span>
        <div className="msgBubble__storyMeta">
          <span className="msgBubble__storyAuthor">
            {authorLabel}
          </span>
          <span className="msgBubble__storyUnavailable">
            {t('messenger.storyUnavailable', { defaultValue: 'Story is no longer available' })}
          </span>
        </div>
      </div>
    );
  }

  const isVideo = preview.mediaType === 'video' || preview.mediaType?.startsWith('video');
  const content = (
    <>
      <div className="msgBubble__storyThumb" aria-hidden="true">
        {isVideo ? (
          <video src={preview.mediaUrl} muted playsInline preload="metadata" />
        ) : (
          <img src={preview.mediaUrl} alt="" />
        )}
        {isVideo ? <span className="msgBubble__storyVideoMark" /> : null}
      </div>
      <div className="msgBubble__storyMeta">
        <span className="msgBubble__storyLabel">
          {t('messenger.storyReply', { defaultValue: 'Story reply' })}
        </span>
        <span className="msgBubble__storyAuthor">{authorLabel}</span>
        {preview.text ? <span className="msgBubble__storyText">{preview.text}</span> : null}
      </div>
    </>
  );

  return (
    <button
      type="button"
      className="msgBubble__storyPreview msgBubble__storyPreview--button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenStory?.(preview);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-label={t('messenger.openStoryReply', {
        defaultValue: 'Open story by {{name}}',
        name: authorLabel,
      })}
    >
      {content}
    </button>
  );
}

export default function MessageBubble({
  message,
  isMine,
  currentUserId,
  peerAvatarUrl,
  peerName = '',
  onOpenMenu,
  onReactionSelect,
  onOpenStory,
  storyAuthorFallback,
  highlight = false,
  seenMessageIds,
}) {
  const { t } = useTranslation();
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const hideReactionsTimerRef = useRef(null);
  const replyTo = message.replyTo;
  const storyPreview = getStoryReplyPreview(message);
  const deletedForEveryone = message.deletedForEveryone === true;
  const myReaction = getMyReactionEmoji(message.reactions, currentUserId);
  const reactionSummary = aggregateReactions(message.reactions || []);
  const isSeenByPeer = isMessageSeenByPeer(message, seenMessageIds);

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

  const canShowReactionBar = !isMine && !deletedForEveryone;

  const clearHideReactionsTimer = () => {
    if (hideReactionsTimerRef.current) {
      clearTimeout(hideReactionsTimerRef.current);
      hideReactionsTimerRef.current = null;
    }
  };

  const scheduleHideReactions = () => {
    clearHideReactionsTimer();
    hideReactionsTimerRef.current = setTimeout(() => {
      setShowReactions(false);
      hideReactionsTimerRef.current = null;
    }, REACTION_HIDE_DELAY_MS);
  };

  const handleHoverZoneEnter = () => {
    if (!canShowReactionBar) return;
    clearHideReactionsTimer();
    setShowReactions(true);
  };

  const handleHoverZoneLeave = () => {
    if (!canShowReactionBar) return;
    scheduleHideReactions();
  };

  useEffect(() => () => clearHideReactionsTimer(), []);

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
        <div
          className={`msgBubbleRow__hoverZone${canShowReactionBar ? ' can-react' : ''}${showReactions ? ' is-reactions-visible' : ''}`}
          onMouseEnter={handleHoverZoneEnter}
          onMouseLeave={handleHoverZoneLeave}
        >
          {showReactions && canShowReactionBar ? (
            <MessageReactionBar
              className="msgBubbleRow__reactions"
              selectedEmoji={myReaction}
              onMouseEnter={clearHideReactionsTimer}
              onSelect={(emoji) => {
                onReactionSelect?.(message, emoji);
                clearHideReactionsTimer();
                setShowReactions(false);
              }}
            />
          ) : null}

          <div
            className={`msgBubble${isMine ? ' msgBubble--mine' : ' msgBubble--theirs'}`}
            onClick={handleBubbleClick}
            onMouseDown={startLongPress}
            onMouseUp={clearLongPress}
            onMouseLeave={clearLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={clearLongPress}
            onTouchMove={clearLongPress}
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
              <StoryReplyPreview
                preview={storyPreview}
                onOpenStory={onOpenStory}
                authorFallback={storyAuthorFallback}
              />
              <MessageAttachments
                attachments={message.attachments}
                isMine={isMine}
                messageType={message.type}
              />
              {message.text ? <MessageText text={message.text} /> : null}
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
            {isMine ? <ReadReceipt isSeen={isSeenByPeer} /> : null}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
