export const MOBILE_MAX = 768;
export const DESKTOP_WIDTH = 380;
export const DESKTOP_MAX_HEIGHT = 480;
export const DESKTOP_MIN_HEIGHT = 280;
export const MOBILE_MAX_HEIGHT = 440;
export const MOBILE_MIN_HEIGHT = 240;
export const GAP = 10;
export const VIEWPORT_PAD = 12;
export const Z_INDEX_PICKER = 11000;
export const TAB_BAR_HEIGHT = 46;

export function computeDesktopPosition(
  triggerRect,
  {
    preferredWidth = DESKTOP_WIDTH,
    maxHeight = DESKTOP_MAX_HEIGHT,
    vw = 1280,
    vh = 800,
  } = {},
) {
  const width = Math.min(
    preferredWidth,
    Math.max(280, vw - VIEWPORT_PAD * 2),
  );
  const spaceAbove = triggerRect.top - VIEWPORT_PAD;
  const spaceBelow = vh - triggerRect.bottom - VIEWPORT_PAD;
  const needed = Math.min(maxHeight, DESKTOP_MIN_HEIGHT);

  let placement = "above";
  if (spaceAbove >= needed + GAP) {
    placement = "above";
  } else if (spaceBelow >= needed + GAP) {
    placement = "below";
  } else {
    placement = spaceBelow > spaceAbove ? "below" : "above";
  }

  const available =
    (placement === "above" ? spaceAbove : spaceBelow) - GAP;
  const height = Math.max(
    220,
    Math.min(maxHeight, available, vh - VIEWPORT_PAD * 2),
  );

  let top =
    placement === "above"
      ? triggerRect.top - height - GAP
      : triggerRect.bottom + GAP;
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - height - VIEWPORT_PAD));

  let left = triggerRect.right - width;
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD));

  return { top, left, width, height, placement };
}

export function computeMobilePosition(
  triggerRect,
  {
    innerWidth = 390,
    innerHeight = 844,
    visualViewport = null,
  } = {},
) {
  const vv = visualViewport;
  const vw = Math.round(vv?.width ?? innerWidth);
  const vvTop = Math.round(vv?.offsetTop ?? 0);
  const vvHeight = Math.round(vv?.height ?? innerHeight);
  const vvBottom = vvTop + vvHeight;
  const triggerTop = triggerRect?.top ?? vvBottom - 72;
  const sheetBottom = Math.min(triggerTop, vvBottom);
  const bottom = Math.max(GAP, innerHeight - sheetBottom + GAP);
  const available = Math.max(
    MOBILE_MIN_HEIGHT,
    sheetBottom - vvTop - VIEWPORT_PAD - GAP,
  );
  const height = Math.max(
    200,
    Math.min(MOBILE_MAX_HEIGHT, available, vvHeight - VIEWPORT_PAD),
  );

  return { width: vw, height, bottom };
}
