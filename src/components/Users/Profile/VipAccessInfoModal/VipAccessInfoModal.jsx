import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import './VipAccessInfoModal.scss';

/**
 * Informational / pre-payment VIP modal.
 * variant:
 *  - info: owner has not enabled VIP yet (public visitor)
 *  - purchase: owner enabled VIP; payment not wired yet
 */
export default function VipAccessInfoModal({
  isOpen,
  onClose,
  variant = 'info',
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title =
    variant === 'purchase'
      ? t('profile.vipAccess.purchaseTitle')
      : t('profile.vipAccess.infoTitle');
  const body =
    variant === 'purchase'
      ? t('profile.vipAccess.purchaseBody')
      : t('profile.vipAccess.infoBody');

  return (
    <div
      className="vipAccessModalOverlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vipAccessModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="vipAccessModal__title">
          {title}
        </h2>
        <p id={descId} className="vipAccessModal__body">
          {body}
        </p>
        <button
          type="button"
          className="vipAccessModal__btn"
          onClick={onClose}
        >
          {t('profile.vipAccess.gotIt')}
        </button>
      </div>
    </div>
  );
}
