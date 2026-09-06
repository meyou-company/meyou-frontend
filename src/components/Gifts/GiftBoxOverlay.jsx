import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { giftsApi } from '../../services/giftsApi';
import { useGiftInboxStore } from '../../zustand/useGiftInboxStore';
import './GiftBoxOverlay.scss';

export default function GiftBoxOverlay() {
  const { t } = useTranslation();
  const current = useGiftInboxStore((s) => s.queue[0] || null);
  const dismissCurrent = useGiftInboxStore((s) => s.dismissCurrent);
  const [phase, setPhase] = useState('box');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setPhase('box');
    setOpening(false);
  }, [current?.id]);

  if (!current) return null;

  const gift = current.gift || {};
  const image = gift.image || current.image;
  const nameKey = gift.nameKey || current.nameKey;
  const giftName = nameKey ? t(nameKey) : '';
  const sender = current.sender;
  const senderName = sender
    ? [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.username
    : '';

  const handleOpen = async () => {
    if (opening || phase !== 'box') return;
    setOpening(true);
    setPhase('opening');
    try {
      await giftsApi.open(current.id);
      window.dispatchEvent(new CustomEvent("meyou:gift-opened"));
    } catch {
      /* Gift stays PENDING in DB and will show again after refresh. */
    }
    setPhase('revealed');
    setOpening(false);
  };

  const handleClose = () => {
    if (opening) return;
    dismissCurrent();
  };

  return (
    <div className="gift-box-overlay" role="dialog" aria-modal="true" aria-label={t('gifts.boxAria')}>
      <button
        type="button"
        className="gift-box-overlay__backdrop"
        onClick={handleClose}
        aria-label={t('common.close')}
      />
      <div className="gift-box-overlay__panel">
        {phase === 'revealed' ? (
          <button type="button" className="gift-box-overlay__reveal" onClick={handleClose}>
            {image ? <img src={image} alt={giftName} className="gift-box-overlay__giftImg" /> : null}
            {giftName ? <p className="gift-box-overlay__name">{giftName}</p> : null}
            {senderName ? (
              <p className="gift-box-overlay__from">{t('gifts.from', { name: senderName })}</p>
            ) : null}
            <span className="gift-box-overlay__hint">{t('common.close')}</span>
          </button>
        ) : (
          <button
            type="button"
            className={`gift-box-overlay__box${phase === 'opening' ? ' is-opening' : ''}`}
            onClick={handleOpen}
            disabled={opening}
          >
            <img src="/gifts/icon/gift.svg" alt="" className="gift-box-overlay__boxImg" />
            <span className="gift-box-overlay__openLabel">{t('gifts.open')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
