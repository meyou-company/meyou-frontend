import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STORY_SAFE_AREA, clampStoryTextPosition } from './storySafeArea.js';

describe('clampStoryTextPosition', () => {
  it('keeps the full text box below the top chrome and above the bottom chrome', () => {
    const clamped = clampStoryTextPosition({
      x: 50,
      y: 0,
      frameWidth: 360,
      frameHeight: 640,
      textWidth: 120,
      textHeight: 40,
    });

    const halfH = (40 / 2 / 640) * 100;
    assert.equal(clamped.x, 50);
    assert.equal(clamped.y, STORY_SAFE_AREA.topPct + halfH);
  });

  it('does not let a wide overlay leave the side safe area', () => {
    const clamped = clampStoryTextPosition({
      x: 0,
      y: 50,
      frameWidth: 360,
      frameHeight: 640,
      textWidth: 180,
      textHeight: 32,
    });

    const halfW = (180 / 2 / 360) * 100;
    assert.equal(clamped.x, STORY_SAFE_AREA.sidePct + halfW);
    assert.equal(clamped.y, 50);
  });
});
