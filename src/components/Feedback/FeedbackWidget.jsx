import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../zustand/useAuthStore';
import { useCallsStore } from '../../zustand/useCallsStore';
import { useFeedbackStore } from '../../zustand/useFeedbackStore';
import {
  FEEDBACK_DRAG_THRESHOLD,
  FEEDBACK_FAB_SIZE,
  FEEDBACK_MOBILE_MQ,
  clampFabPosition,
  getFeedbackFabBounds,
  isFeedbackMobileViewport,
  loadFabPosition,
  saveFabPosition,
  snapFabToEdge,
} from '../../utils/feedbackFabPosition';
import FeedbackModal from './FeedbackModal';
import './FeedbackWidget.scss';

const IMMERSIVE_SELECTORS = [
  '.storyViewer',
  '.videoPlayerModal',
  '.callOverlay',
  '.gift-box-overlay',
  '.msgMediaViewer',
  '.createPostModal',
].join(', ');

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2c-4.7 0-8.5 3.2-8.5 7.1 0 2.1 1.1 4 2.9 5.3-.1.8-.5 1.9-1.6 3.1 1.8-.2 3.2-.9 4.1-1.5.9.2 1.9.3 3.1.3 4.7 0 8.5-3.2 8.5-7.1S16.7 3.2 12 3.2Z"
      />
    </svg>
  );
}

function useImmersiveHidden() {
  const callPhase = useCallsStore((s) => s.phase);
  const [overlayHidden, setOverlayHidden] = useState(false);

  useEffect(() => {
    const tick = () => {
      setOverlayHidden(Boolean(document.querySelector(IMMERSIVE_SELECTORS)));
    };
    tick();
    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return callPhase !== 'idle' || overlayHidden;
}

function useShowFeedbackFab() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const isAuthRoute =
    location.pathname.startsWith('/auth') || location.pathname === '/auth/callback';
  const isLegalRoute = location.pathname.startsWith('/legal');
  const isFeatureRoute =
    location.pathname.startsWith('/features') || location.pathname === '/earn';
  const isLanding = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLiveRoute = location.pathname.startsWith('/live');
  const profileComplete = user?.profileCompleted === true;
  return !(
    isAuthRoute ||
    isLegalRoute ||
    isFeatureRoute ||
    isAdminRoute ||
    isLiveRoute ||
    location.pathname === '/users/profile/complete' ||
    !isAuthed ||
    !user ||
    !profileComplete ||
    isLanding
  );
}

export default function FeedbackWidget() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const showFab = useShowFeedbackFab();
  const isOpen = useFeedbackStore((s) => s.isOpen);
  const open = useFeedbackStore((s) => s.open);
  const close = useFeedbackStore((s) => s.close);
  const unreadCount = useFeedbackStore((s) => s.unreadCount);
  const fetchUnreadCount = useFeedbackStore((s) => s.fetchUnreadCount);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const immersiveHidden = useImmersiveHidden();
  const buttonRef = useRef(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const [isMobile, setIsMobile] = useState(isFeedbackMobileViewport);
  const [coords, setCoords] = useState(() =>
    isFeedbackMobileViewport() ? loadFabPosition() : null,
  );

  const relayout = useCallback(() => {
    const mobile = isFeedbackMobileViewport();
    setIsMobile(mobile);
    if (!mobile) {
      setCoords(null);
      return;
    }
    setCoords((prev) => {
      const bounds = getFeedbackFabBounds();
      const next = prev?.side
        ? {
            side: prev.side,
            x: prev.side === 'left' ? bounds.minX : bounds.maxX,
            y: clampFabPosition(0, prev.y, bounds).y,
          }
        : loadFabPosition(bounds);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isAuthed) return undefined;
    void fetchUnreadCount();
    const id = window.setInterval(() => {
      void fetchUnreadCount();
    }, 45000);
    return () => window.clearInterval(id);
  }, [isAuthed, fetchUnreadCount]);

  useEffect(() => {
    if (isOpen || !isAuthed) return undefined;
    void fetchUnreadCount();
    return undefined;
  }, [isOpen, isAuthed, fetchUnreadCount]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const feedbackId = params.get('feedback');
    if (!feedbackId || !isAuthed) return undefined;
    open({ feedbackId });
    params.delete('feedback');
    const next = params.toString();
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : '' },
      { replace: true },
    );
    return undefined;
  }, [location.search, location.pathname, isAuthed, open, navigate]);

  useEffect(() => {
    relayout();
    const mq = window.matchMedia(FEEDBACK_MOBILE_MQ);
    const onChange = () => relayout();
    mq.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    window.visualViewport?.addEventListener('resize', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
      window.visualViewport?.removeEventListener('resize', onChange);
    };
  }, [relayout, location.pathname]);

  useEffect(() => {
    if (!isMobile) return undefined;
    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < FEEDBACK_DRAG_THRESHOLD) return;
      drag.moved = true;
      event.preventDefault();
      const bounds = getFeedbackFabBounds();
      setCoords({
        ...clampFabPosition(drag.originX + dx, drag.originY + dy, bounds),
        side: null,
      });
    };
    const onUp = (event) => {
      const drag = dragRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      drag.active = false;
      if (drag.moved) {
        setCoords((prev) => {
          if (!prev) return prev;
          const snapped = snapFabToEdge(prev.x, prev.y);
          saveFabPosition(snapped);
          return snapped;
        });
      }
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isMobile]);

  const handlePointerDown = (event) => {
    if (!isMobile || event.button !== 0) return;
    const node = buttonRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    node.setPointerCapture?.(event.pointerId);
  };

  const handleClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    open();
  };

  const style =
    isMobile && coords
      ? {
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          right: 'auto',
          bottom: 'auto',
          width: `${FEEDBACK_FAB_SIZE}px`,
          height: `${FEEDBACK_FAB_SIZE}px`,
        }
      : undefined;

  const fab = (
    <button
      ref={buttonRef}
      type="button"
      className={`feedbackFab${isMobile ? ' feedbackFab--mobile' : ' feedbackFab--desktop'}${
        immersiveHidden ? ' is-hidden' : ''
      }`}
      style={style}
      aria-label={t('feedback.fabAria')}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      hidden={immersiveHidden}
    >
      <span className="feedbackFab__icon" aria-hidden="true">
        {isMobile ? <ChatIcon /> : '💬'}
      </span>
      {!isMobile ? (
        <span className="feedbackFab__label">{t('feedback.fabLabel')}</span>
      ) : null}
      {unreadCount > 0 ? (
        <span className="feedbackFab__badge" aria-label={t('feedback.unreadAria', { count: unreadCount })}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <>
      {showFab ? createPortal(fab, document.body) : null}
      <FeedbackModal
        isOpen={isOpen}
        onClose={close}
        returnFocusRef={buttonRef}
      />
    </>
  );
}
