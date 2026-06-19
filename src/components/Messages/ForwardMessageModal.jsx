import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { conversationsApi } from '../../services/conversationsApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './ForwardMessageModal.scss';

function getDisplayName(user, fallback) {
  if (!user) return fallback;
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.username || user.name || fallback;
}

export default function ForwardMessageModal({
  isOpen,
  message,
  conversations = [],
  currentConversationId,
  onClose,
  onForwarded,
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !message) return null;

  const targets = conversations.filter(
    (c) => String(c.id) !== String(currentConversationId),
  );

  const handleSelect = async (conversationId) => {
    try {
      setSubmitting(true);
      const forwarded = await conversationsApi.forwardMessage(message.id, conversationId);
      toast.success(t('messenger.forward.success'));
      onForwarded?.(forwarded, conversationId);
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="msgModalOverlay" role="presentation" onClick={onClose}>
      <div
        className="msgModal msgModal--forward"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="msgModal__head">
          <h2 id="forward-modal-title">{t('messenger.forward.title')}</h2>
          <button type="button" className="msgModal__close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        {targets.length === 0 ? (
          <p className="msgModal__hint">{t('messenger.forward.noChats')}</p>
        ) : (
          <ul className="msgModal__list">
            {targets.map((chat) => {
              const name = getDisplayName(chat.participant, t('common.user'));
              return (
                <li key={chat.id}>
                  <button
                    type="button"
                    className="msgModal__listBtn"
                    disabled={submitting}
                    onClick={() => handleSelect(chat.id)}
                  >
                    <span className="msgModal__avatar">
                      {chat.participant?.avatarUrl ? (
                        <img src={chat.participant.avatarUrl} alt="" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span>{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
