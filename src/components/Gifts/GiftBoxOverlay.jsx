import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getGiftDisplayById } from '../../constants/giftDisplayCatalog';
import { giftsApi } from '../../services/giftsApi';
import {
  selectPendingGiftCount,
  useGiftInboxStore,
} from '../../zustand/useGiftInboxStore';
import './GiftBoxOverlay.scss';

const BOX_CLOSED = '/gifts/box/gift-box-closed.webp';
const BOX_BASE = '/gifts/box/gift-box-base.webp';
const BOX_LID = '/gifts/box/gift-box-lid.webp';

const ENTER_MS = 480;
const OPENING_MS = 1080;
const DISMISS_MS = 280;
const REDUCED_ENTER_MS = 80;
const REDUCED_OPENING_MS = 180;
const REDUCED_DISMISS_MS = 140;

const SPARKLES = [
  { x: -22, y: -78, d: 0.22, s: 7 },
  { x: 28, y: -92, d: 0.28, s: 5 },
  { x: -56, y: -44, d: 0.34, s: 6 },
  { x: 62, y: -38, d: 0.3, s: 8 },
  { x: -6, y: -118, d: 0.4, s: 4 },
  { x: 16, y: -62, d: 0.24, s: 6 },
  { x: -40, y: -96, d: 0.46, s: 5 },
  { x: 48, y: -108, d: 0.36, s: 7 },
  { x: 8, y: -136, d: 0.42, s: 4 },
  { x: -72, y: -70, d: 0.5, s: 5 },
];

const HEARTS = [
  { x: -36, y: -102, d: 0.26, s: 14 },
  { x: 42, y: -86, d: 0.34, s: 11 },
  { x: -8, y: -128, d: 0.4, s: 13 },
  { x: 20, y: -70, d: 0.3, s: 10 },
  { x: -58, y: -58, d: 0.48, s: 12 },
  { x: 64, y: -118, d: 0.38, s: 9 },
  { x: 6, y: -148, d: 0.44, s: 11 },
  { x: -78, y: -88, d: 0.52, s: 8 },
];

const CONFETTI = [
  { x: -82, y: -96, r: -48, c: '#ff4fb1', w: 8, h: 14, d: 0.2 },
  { x: 88, y: -108, r: 32, c: '#ffd166', w: 7, h: 16, d: 0.24 },
  { x: -48, y: -132, r: 18, c: '#7ae0ff', w: 6, h: 12, d: 0.28 },
  { x: 54, y: -74, r: -28, c: '#ff8ad4', w: 9, h: 11, d: 0.22 },
  { x: -14, y: -154, r: 40, c: '#fff4c2', w: 5, h: 13, d: 0.32 },
  { x: 96, y: -58, r: -18, c: '#c084fc', w: 8, h: 15, d: 0.36 },
  { x: -98, y: -52, r: 22, c: '#fb7185', w: 6, h: 14, d: 0.3 },
  { x: 18, y: -122, r: -36, c: '#fbbf24', w: 7, h: 10, d: 0.26 },
  { x: -66, y: -78, r: 8, c: '#fda4af', w: 5, h: 12, d: 0.4 },
  { x: 72, y: -138, r: -52, c: '#a5b4fc', w: 8, h: 13, d: 0.34 },
  { x: -28, y: -64, r: 26, c: '#f9a8d4', w: 6, h: 11, d: 0.18 },
  { x: 38, y: -48, r: -14, c: '#fde68a', w: 9, h: 9, d: 0.38 },
];

const SMILE_ASSET = '/gifts/smile.webp';
const SMILE_OPENING_MS = 1180;

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
  const id = current?.gift?.id || current?.giftId;
  return getGiftDisplayById(id)?.image || current?.gift?.image || current?.image;
}

function senderIdOf(item) {
  return item?.sender?.id || item?.senderId || '';
}

export default function GiftBoxOverlay() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queued = useGiftInboxStore((s) => s.queue[0] || null);
  const pendingCount = useGiftInboxStore(selectPendingGiftCount);
  const current = queued || previewGiftFromQuery();
  const dismissCurrent = useGiftInboxStore((s) => s.dismissCurrent);
  const markOpened = useGiftInboxStore((s) => s.markOpened);
  const [phase, setPhase] = useState('enter');
  const [busy, setBusy] = useState(false);
  const [previewClosed, setPreviewClosed] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const timersRef = useRef([]);
  const thanksRef = useRef(null);
  const giftIdRef = useRef(null);
  const pendingCountRef = useRef(pendingCount);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => {
    if (pendingCount > pendingCountRef.current) setSuppressed(false);
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);

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

  if (previewClosed || !current || (suppressed && queued)) return null;

  const gift = current.gift || {};
  const giftKind = resolveGiftKind(current);
  const image = resolveGiftImage(current, giftKind);
  const nameKey =
    gift.nameKey ||
    current.nameKey ||
    getGiftDisplayById(gift.id || current.giftId)?.nameKey;
  const sparkles = SPARKLES;
  const hearts = HEARTS;
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
          markOpened(openedId);
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
    const openedThisGift = phase === 'revealed';
    setBusy(true);
    setPhase('dismiss');
    later(() => {
      setBusy(false);
      if (current.id === 'preview') {
        setPreviewClosed(true);
        return;
      }
      if (openedThisGift) {
        dismissCurrent();
        return;
      }
      setSuppressed(true);
    }, prefersReducedMotion() ? REDUCED_DISMISS_MS : DISMISS_MS);
  };

  const handleThanks = () => {
    if (!canDismiss || phase !== 'revealed') return;
    const senderId = senderIdOf(current);
    const name = senderName;
    const isPreview = current.id === 'preview';
    setBusy(true);
    setPhase('dismiss');
    later(() => {
      setBusy(false);
      if (senderId) {
        navigate(`/my-gifts?to=${encodeURIComponent(senderId)}&thank=1`, {
          replace: true,
          state: { receiverName: name },
        });
      }
      if (!isPreview) dismissCurrent();
      else setPreviewClosed(true);
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
            {CONFETTI.map((item, index) => (
              <span
                key={`c-${index}`}
                className="gift-box-overlay__confetti"
                style={{
                  '--dx': `${item.x}px`,
                  '--dy': `${item.y}px`,
                  '--rot': `${item.r}deg`,
                  '--delay': `${item.d}s`,
                  '--w': `${item.w}px`,
                  '--h': `${item.h}px`,
                  '--color': item.c,
                }}
              />
            ))}
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
              onClick={handleThanks}
            >
              {t('gifts.thankYou')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
