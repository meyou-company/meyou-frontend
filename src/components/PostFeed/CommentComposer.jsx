import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPickerButton from '../EmojiPicker/EmojiPickerButton';

export default function CommentComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  sendAriaLabel,
  className = '',
  compact = false,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const draftTrimmed = (value ?? '').trim();
  const canSend = draftTrimmed.length > 0;

  const resolvedPlaceholder = placeholder ?? t('comments.placeholder');
  const resolvedAriaLabel = ariaLabel ?? t('comments.composeAria');
  const resolvedSendAria = sendAriaLabel ?? t('comments.sendAria');

  const handleSubmit = () => {
    if (!canSend) return;
    onSubmit?.();
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleSubmit();
  };

  const rootClass = [
    'commentComposer',
    compact ? 'commentComposer--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <div
        ref={wrapperRef}
        className="commentComposer__inputWrapper commentInputWrapper"
      >
        <textarea
          ref={inputRef}
          className="postCommentsSection__input commentComposer__input"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={resolvedPlaceholder}
          aria-label={resolvedAriaLabel}
        />
        <div className="postCommentsSection__inputActions commentComposer__actions">
          <EmojiPickerButton
            inputRef={inputRef}
            value={value ?? ''}
            onChange={onChange}
            variant="inline"
            popoverContainerRef={wrapperRef}
            pickerClassName="emojiPickerPopup"
            ariaLabel={t('comments.addEmoji')}
          />
          <button
            type="button"
            className="postCommentsSection__sendBtn"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label={resolvedSendAria}
          >
            <img
              src="/icon1/push.png"
              alt=""
              className="postCommentsSection__sendIcon"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
