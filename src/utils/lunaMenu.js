export const LUNA_MENU_WIDTH_PX = 280;
export const LUNA_MENU_MAX_WIDTH_PX = 300;
export const LUNA_MENU_GAP_PX = 7;
export const LUNA_MENU_VIEWPORT_MARGIN_PX = 8;

export function placeLunaMenu(anchorRect, viewport, options = {}) {
  const preferredWidth = options.width ?? LUNA_MENU_WIDTH_PX;
  const gap = options.gap ?? LUNA_MENU_GAP_PX;
  const margin = options.margin ?? LUNA_MENU_VIEWPORT_MARGIN_PX;
  const estimatedHeight = options.height ?? 280;
  const vw = Number(viewport?.width) || 0;
  const vh = Number(viewport?.height) || 0;
  const width = Math.min(
    LUNA_MENU_MAX_WIDTH_PX,
    preferredWidth,
    Math.max(160, vw - margin * 2),
  );

  let top = (anchorRect?.bottom ?? 0) + gap;
  if (top + estimatedHeight > vh - margin) {
    const above = (anchorRect?.top ?? 0) - gap - estimatedHeight;
    if (above >= margin) top = above;
    else top = Math.max(margin, Math.min(top, Math.max(margin, vh - margin - 48)));
  }

  let left = (anchorRect?.right ?? width) - width;
  if (left < margin) left = margin;
  if (left + width > vw - margin) left = Math.max(margin, vw - margin - width);

  const maxHeight = Math.max(48, vh - top - margin);
  return { top, left, width, maxHeight };
}
