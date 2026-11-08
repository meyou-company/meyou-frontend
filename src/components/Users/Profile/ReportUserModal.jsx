import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usersApi } from '../../../services/usersApi';
import { getApiErrorMessage } from '../../../utils/getApiErrorMessage';
import '../../Messages/ForwardMessageModal.scss';

export default function ReportUserModal({ isOpen, userId, onClose }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !userId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3 || submitting) return;

    try {
      setSubmitting(true);
      await usersApi.reportUser(userId, trimmed);
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
        aria-labelledby="report-user-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="msgModal__head">
          <h2 id="report-user-modal-title">{t('profile.visitor.report')}</h2>
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
            minLength={3}
            maxLength={2000}
            required
          />
        </label>
        <button
          type="submit"
          className="msgModal__submit"
          disabled={submitting || reason.trim().length < 3}
        >
          {t('messenger.report.submit')}
        </button>
      </form>
    </div>
  );
}
