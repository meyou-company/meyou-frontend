import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { giftsApi } from '../../services/giftsApi';
import { useGiftInboxStore } from '../../zustand/useGiftInboxStore';
import './GiftBoxOverlay.scss';

const BOX_CLOSED = '/gifts/box/gift-box-closed.webp';
const BOX_BASE = '/gifts/box/gift-box-base.webp';
const BOX_LID = '/gifts/box/gift-box-lid.webp';

const ENTER_MS = 560;
const OPENING_MS = 1400;
const DISMISS_MS = 320;
const REDUCED_ENTER_MS = 80;
const REDUCED_OPENING_MS = 220;
const REDUCED_DISMISS_MS = 160;

const SPARKLES = [
  { x: -18, y: -72, d: 0.55, s: 7 },
  { x: 22, y: -84, d: 0.62, s: 5 },
  { x: -48, y: -40, d: 0.7, s: 6 },
  { x: 52, y: -36, d: 0.66, s: 8 },
  { x: -8, y: -108, d: 0.78, s: 4 },
  { x: 12, y: -58, d: 0.58, s: 6 },
  { x: -36, y: -88, d: 0.84, s: 5 },
  { x: 40, y: -96, d: 0.74, s: 7 },
];

const HEARTS = [
  { x: -28, y: -92, d: 0.6, s: 14 },
  { x: 34, y: -78, d: 0.72, s: 11 },
  { x: -6, y: -118, d: 0.8, s: 13 },
  { x: 16, y: -64, d: 0.68, s: 10 },
  { x: -44, y: -54, d: 0.88, s: 12 },
  { x: 48, y: -110, d: 0.76, s: 9 },
];

const SPARKLES_SMILE = [
  { x: -22, y: -78, d: 0.58, s: 6 },
  { x: 26, y: -88, d: 0.66, s: 5 },
  { x: 8, y: -108, d: 0.74, s: 4 },
];

const HEARTS_SMILE = [
  { x: -30, y: -86, d: 0.62, s: 12 },
  { x: 32, y: -72, d: 0.7, s: 10 },
];

const SMILE_ASSET = '/gifts/smile.webp';
const SMILE_OPENING_MS = 1580;

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

const PREVIEW_SENDER = { firstName: 'Anja', lastName: 'Kuzma' };

const PREVIEW_GIFTS = {
  smile: {
    id: 'preview',
    giftId: 'smile',
    message: 'Для тебе 💕',
    image: SMILE_ASSET,
    nameKey: 'gifts.catalog.smile',
    sender: PREVIEW_SENDER,
    gift: {
      id: 'smile',
      image: SMILE_ASSET,
      nameKey: 'gifts.catalog.smile',
    },
  },
  flowers: {
    id: 'preview',
    giftId: 'flowers',
    message: 'Для тебе 💕',
    image: '/gifts/flowers.png',
    nameKey: 'gifts.catalog.flowers',
    sender: PREVIEW_SENDER,
    gift: {
      id: 'flowers',
      image: '/gifts/flowers.png',
      nameKey: 'gifts.catalog.flowers',
    },
  },
};

function previewGiftFromQuery() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('giftBoxPreview');
  if (value === 'flowers') return PREVIEW_GIFTS.flowers;
  if (value === '1' || value === 'smile') return PREVIEW_GIFTS.smile;
  return null;
}

function resolveGiftKind(current) {
  const id = current?.gift?.id || current?.giftId || '';
  if (id === 'smile') return 'smile';
  const image = current?.gift?.image || current?.image || '';
  if (typeof image === 'string' && /\/smile\.(webp|jpg|png)(\?|$)/i.test(image)) {
    return 'smile';
  }
  return 'default';
}

function resolveGiftImage(current, giftKind) {
  if (giftKind === 'smile') return SMILE_ASSET;
  return current?.gift?.image || current?.image;
}

export default function GiftBoxOverlay() {
  const { t, i18n } = useTranslation();
  const queued = useGiftInboxStore((s) => s.queue[0] || null);
  const current = queued || previewGiftFromQuery();
  const dismissCurrent = useGiftInboxStore((s) => s.dismissCurrent);
  const [phase, setPhase] = useState('enter');
  const [busy, setBusy] = useState(false);
  const [previewClosed, setPreviewClosed] = useState(false);
  const timersRef = useRef([]);
  const thanksRef = useRef(null);
  const giftIdRef = useRef(null);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => {
    clearTimers();
    if (!current?.id) return undefined;
    giftIdRef.current = current.id;
    setBusy(false);
    setPhase('enter');
    later(
      () => setPhase('idle'),
      prefersReducedMotion() ? REDUCED_ENTER_MS : ENTER_MS,
    );
    return clearTimers;
  }, [current?.id]);

  useEffect(() => {
    if (phase === 'revealed') {
      thanksRef.current?.focus();
    }
  }, [phase]);

  if (previewClosed || !current) return null;

  const gift = current.gift || {};
  const giftKind = resolveGiftKind(current);
  const image = resolveGiftImage(current, giftKind);
  const nameKey = gift.nameKey || current.nameKey;
  const sparkles = giftKind === 'smile' ? SPARKLES_SMILE : SPARKLES;
  const hearts = giftKind === 'smile' ? HEARTS_SMILE : HEARTS;
  const giftName = nameKey ? t(nameKey) : '';
  const sender = current.sender;
  const senderName = sender
    ? [sender.firstName, sender.lastName].filter(Boolean).join(' ') ||
      sender.username
    : '';
  const message = typeof current.message === 'string' ? current.message.trim() : '';
  const showIdleCopy = phase === 'enter' || phase === 'idle';
  const showRevealCard = phase === 'revealed' || phase === 'dismiss';
  const canTapBox = phase === 'idle' && !busy;
  const canDismiss = (phase === 'idle' || phase === 'revealed') && !busy;

  const handleOpen = () => {
    if (!canTapBox) return;
    setBusy(true);
    setPhase('opening');
    const openedId = current.id;
    if (openedId !== 'preview') {
      void giftsApi
        .open(openedId)
        .then(() => {
          if (giftIdRef.current !== openedId) return;
          window.dispatchEvent(new CustomEvent('meyou:gift-opened'));
        })
        .catch(() => {
          /* Gift stays PENDING in DB and will show again after refresh. */
        });
    }
    later(() => {
      setPhase('revealed');
      setBusy(false);
    }, prefersReducedMotion()
      ? REDUCED_OPENING_MS
      : giftKind === 'smile'
        ? SMILE_OPENING_MS
        : OPENING_MS);
  };

  const handleDismiss = () => {
    if (!canDismiss) return;
    setBusy(true);
    setPhase('dismiss');
    later(() => {
      setBusy(false);
      if (current.id === 'preview') setPreviewClosed(true);
      else dismissCurrent();
    }, prefersReducedMotion() ? REDUCED_DISMISS_MS : DISMISS_MS);
  };

  return (
    <div
      className={`gift-box-overlay gift-box-overlay--${phase} gift-box-overlay--gift-${giftKind}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('gifts.boxAria')}
      dir={i18n.dir()}
    >
      <button
        type="button"
        className="gift-box-overlay__backdrop"
        onClick={handleDismiss}
        disabled={!canDismiss}
        aria-label={t('common.close')}
      />

      <div className="gift-box-overlay__stage">
        <div className="gift-box-overlay__scene" aria-hidden={showRevealCard}>
          <div className="gift-box-overlay__aura" />

          <div className="gift-box-scene">
            <img
              src={BOX_BASE}
              alt=""
              className="gift-box-overlay__base"
              draggable={false}
            />
            <div className="gift-box-overlay__innerGlow" />
            {image ? (
              <div className={`gift-box-overlay__giftWell gift-box-overlay__giftWell--${giftKind}`}>
                <img
                  src={image}
                  alt={showRevealCard ? giftName : ''}
                  className={`gift-box-overlay__gift gift-box-overlay__gift--${giftKind}`}
                  draggable={false}
                />
              </div>
            ) : null}
            <img
              src={BOX_LID}
              alt=""
              className="gift-box-overlay__lid"
              draggable={false}
            />
            <img
              src={BOX_CLOSED}
              alt=""
              className="gift-box-overlay__closed"
              draggable={false}
            />
          </div>

          <div className="gift-box-overlay__burst" aria-hidden="true">
            {sparkles.map((item, index) => (
              <span
                key={`s-${index}`}
                className="gift-box-overlay__spark"
                style={{
                  '--dx': `${item.x}px`,
                  '--dy': `${item.y}px`,
                  '--delay': `${item.d}s`,
                  '--size': `${item.s}px`,
                }}
              />
            ))}
            {hearts.map((item, index) => (
              <span
                key={`h-${index}`}
                className="gift-box-overlay__heart"
                style={{
                  '--dx': `${item.x}px`,
                  '--dy': `${item.y}px`,
                  '--delay': `${item.d}s`,
                  '--size': `${item.s}px`,
                }}
              >
                ❤
              </span>
            ))}
          </div>

          {showIdleCopy ? (
            <button
              type="button"
              className="gift-box-overlay__boxHit"
              onClick={handleOpen}
              disabled={!canTapBox}
              aria-label={t('gifts.tapToOpen')}
            />
          ) : null}
        </div>

        {showIdleCopy ? (
          <>
            <p className="gift-box-overlay__kicker">{t('gifts.youHaveAGift')}</p>
            <p className="gift-box-overlay__hint">{t('gifts.tapToOpen')}</p>
          </>
        ) : null}

        {showRevealCard ? (
          <div className="gift-box-overlay__card">
            {senderName ? (
              <p className="gift-box-overlay__from">
                {t('gifts.fromSender', { name: senderName })}
              </p>
            ) : null}
            {giftName ? (
              <p className="gift-box-overlay__name">{giftName}</p>
            ) : null}
            {message ? (
              <p className="gift-box-overlay__message">{message}</p>
            ) : null}
            <button
              type="button"
              ref={thanksRef}
              className="gift-box-overlay__thanks"
              onClick={handleDismiss}
            >
              {t('gifts.thankYou')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
