const STORAGE_KEY = 'lunmeyo.feedbackFab.position';
export const FEEDBACK_FAB_SIZE = 52;
export const FEEDBACK_FAB_MARGIN = 10;
export const FEEDBACK_DRAG_THRESHOLD = 8;
export const FEEDBACK_MOBILE_MQ = '(max-width: 768px)';

export function isFeedbackMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(FEEDBACK_MOBILE_MQ).matches;
}

function parseInset(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function readSafeAreaInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseInset(style.paddingTop),
    right: parseInset(style.paddingRight),
    bottom: parseInset(style.paddingBottom),
    left: parseInset(style.paddingLeft),
  };
  probe.remove();
  return insets;
}

function isMessagesChatOpen() {
  if (typeof document === 'undefined') return false;
  return (
    document.body.classList.contains('messages-chat-open') ||
    Boolean(document.querySelector('.messagesPage--chatOpen'))
  );
}

export function getFeedbackFabBounds(size = FEEDBACK_FAB_SIZE) {
  const safe = readSafeAreaInsets();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const chatOpen = isMessagesChatOpen();
  const navReserve = chatOpen ? 0 : 64;
  const composerReserve = chatOpen ? 88 : 0;
  const minX = FEEDBACK_FAB_MARGIN + safe.left;
  const maxX = Math.max(minX, width - size - FEEDBACK_FAB_MARGIN - safe.right);
  const minY = FEEDBACK_FAB_MARGIN + safe.top;
  const maxY = Math.max(
    minY,
    height - size - FEEDBACK_FAB_MARGIN - safe.bottom - navReserve - composerReserve,
  );
  return { minX, maxX, minY, maxY, size };
}

export function clampFabPosition(x, y, bounds = getFeedbackFabBounds()) {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

export function snapFabToEdge(x, y, bounds = getFeedbackFabBounds()) {
  const clamped = clampFabPosition(x, y, bounds);
  const centerX = clamped.x + bounds.size / 2;
  const side = centerX < window.innerWidth / 2 ? 'left' : 'right';
  return {
    side,
    x: side === 'left' ? bounds.minX : bounds.maxX,
    y: clamped.y,
  };
}

export function defaultFabPosition(bounds = getFeedbackFabBounds()) {
  const rtl =
    typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const side = rtl ? 'left' : 'right';
  return {
    side,
    x: side === 'left' ? bounds.minX : bounds.maxX,
    y: bounds.maxY,
  };
}

export function loadFabPosition(bounds = getFeedbackFabBounds()) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFabPosition(bounds);
    const parsed = JSON.parse(raw);
    if (parsed?.side !== 'left' && parsed?.side !== 'right') {
      return defaultFabPosition(bounds);
    }
    const y = Number(parsed.y);
    if (!Number.isFinite(y)) return defaultFabPosition(bounds);
    return {
      side: parsed.side,
      x: parsed.side === 'left' ? bounds.minX : bounds.maxX,
      y: clampFabPosition(0, y, bounds).y,
    };
  } catch {
    return defaultFabPosition(bounds);
  }
}

export function saveFabPosition({ side, y }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ side, y: Math.round(y) }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
