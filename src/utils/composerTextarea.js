export const COMPOSER_MAX_LINES = 5;

export function fitComposerTextarea(el) {
  if (!el) return 0;
  el.style.height = '0px';
  const maxHeight =
    typeof window !== 'undefined'
      ? Number.parseFloat(window.getComputedStyle(el).maxHeight)
      : Number.NaN;
  const next = Number.isFinite(maxHeight)
    ? Math.min(el.scrollHeight, maxHeight)
    : el.scrollHeight;
  el.style.height = `${next}px`;
  return next;
}

export function shouldSendOnEnter(event, { coarsePointer = false } = {}) {
  if (!event || event.key !== 'Enter' || event.shiftKey) return false;
  if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229) {
    return false;
  }
  if (coarsePointer) return false;
  return true;
}

export function isScrollerNearBottom(scroller, thresholdPx = 80) {
  if (!scroller) return false;
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= thresholdPx;
}

export function pinScrollerToBottom(scroller) {
  if (!scroller) return;
  scroller.scrollTop = scroller.scrollHeight;
}
