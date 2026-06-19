import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { conversationsApi } from '../../services/conversationsApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './ForwardMessageModal.scss';

export default function EditMessageModal({ isOpen, message, onClose, onSaved }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && message) {
      setText(message.text || '');
    }
  }, [isOpen, message]);

  if (!isOpen || !message) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    try {
      setSubmitting(true);
      const updated = await conversationsApi.editMessage(message.id, trimmed);
      toast.success(t('messenger.edit.success'));
      onSaved?.(updated);
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="msgModalOverlay" role="presentation" onClick={onClose}>
      <form
        className="msgModal msgModal--edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="msgModal__head">
          <h2 id="edit-modal-title">{t('messenger.edit.title')}</h2>
          <button type="button" className="msgModal__close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <textarea
          className="msgModal__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          autoFocus
          required
        />
        <button type="submit" className="msgModal__submit" disabled={submitting || !text.trim()}>
          {t('common.save')}
        </button>
      </form>
    </div>
  );
}
