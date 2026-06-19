import { useTranslation } from 'react-i18next';
import { MESSAGE_REACTION_EMOJIS } from '../../constants/messageReactions';
import './MessageReactionBar.scss';

export default function MessageReactionBar({
  onSelect,
  className = '',
  selectedEmoji,
  onMouseEnter,
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`msgReactionBar ${className}`.trim()}
      role="toolbar"
      aria-label={t('messenger.reactions.aria')}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
    >
      {MESSAGE_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={`msgReactionBar__btn${selectedEmoji === emoji ? ' is-selected' : ''}`}
          onClick={() => onSelect?.(emoji)}
          aria-label={emoji}
          aria-pressed={selectedEmoji === emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
