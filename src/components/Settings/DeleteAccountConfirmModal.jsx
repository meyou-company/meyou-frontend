import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './DeleteAccountConfirmModal.scss';

const CONFIRM_TOKEN = 'DELETE';

export default function DeleteAccountConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  confirming = false,
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = confirmText === CONFIRM_TOKEN && !confirming;

  return (
    <div
      className="deleteAccountModalOverlay"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="deleteAccountModal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="deleteAccountModal__title">
          {t('settings.security.deleteAccount.modalTitle')}
        </p>
        <p id={descId} className="deleteAccountModal__warning">
          {t('settings.security.deleteAccount.modalWarning')}
        </p>
        <label className="deleteAccountModal__label" htmlFor={inputId}>
          {t('settings.security.deleteAccount.modalInputLabel')}
        </label>
        <input
          id={inputId}
          type="text"
          className="deleteAccountModal__input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_TOKEN}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={confirming}
        />
        <div className="deleteAccountModal__actions">
          <button
            type="button"
            className="deleteAccountModal__btn deleteAccountModal__btn--cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            {t('settings.security.deleteAccount.modalCancel')}
          </button>
          <button
            type="button"
            className="deleteAccountModal__btn deleteAccountModal__btn--confirm"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {confirming
              ? t('settings.security.deleteAccount.modalConfirming')
              : t('settings.security.deleteAccount.modalConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
