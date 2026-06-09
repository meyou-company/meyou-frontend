import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { conversationsApi } from '../../services/conversationsApi';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import './ForwardMessageModal.scss';

export default function ReportMessageModal({ isOpen, message, onClose }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !message) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;

    try {
      setSubmitting(true);
      await conversationsApi.reportMessage(message.id, trimmed);
      toast.success(t('messenger.report.success'));
      setReason('');
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
        className="msgModal msgModal--report"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="msgModal__head">
          <h2 id="report-modal-title">{t('messenger.report.title')}</h2>
          <button type="button" className="msgModal__close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <label className="msgModal__label">
          {t('messenger.report.reasonLabel')}
          <textarea
            className="msgModal__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('messenger.report.reasonPlaceholder')}
            rows={4}
            maxLength={1000}
            required
          />
        </label>
        <button type="submit" className="msgModal__submit" disabled={submitting || !reason.trim()}>
          {t('messenger.report.submit')}
        </button>
      </form>
    </div>
  );
}
