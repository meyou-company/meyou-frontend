/** Shared 9:16 story canvas insets (% of frame). Matches viewer chrome. */
export const STORY_SAFE_AREA = {
  topPct: 16,
  bottomPct: 12,
  sidePct: 6,
};

export function clampStoryTextPosition({
  x,
  y,
  frameWidth,
  frameHeight,
  textWidth = 0,
  textHeight = 0,
}) {
  const width = Math.max(1, Number(frameWidth) || 1);
  const height = Math.max(1, Number(frameHeight) || 1);
  const halfW = ((Number(textWidth) || 0) / 2 / width) * 100;
  const halfH = ((Number(textHeight) || 0) / 2 / height) * 100;

  let minX = STORY_SAFE_AREA.sidePct + halfW;
  let maxX = 100 - STORY_SAFE_AREA.sidePct - halfW;
  let minY = STORY_SAFE_AREA.topPct + halfH;
  let maxY = 100 - STORY_SAFE_AREA.bottomPct - halfH;

  if (minX > maxX) {
    minX = 50;
    maxX = 50;
  }
  if (minY > maxY) {
    minY = (STORY_SAFE_AREA.topPct + (100 - STORY_SAFE_AREA.bottomPct)) / 2;
    maxY = minY;
  }

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
}
