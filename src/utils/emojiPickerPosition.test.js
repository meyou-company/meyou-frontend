import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDesktopPosition,
  computeMobilePosition,
  DESKTOP_WIDTH,
  VIEWPORT_PAD,
} from "./emojiPickerPosition.js";

describe("emoji picker position", () => {
  it("keeps the desktop popup inside the viewport and above a bottom composer", () => {
    const pos = computeDesktopPosition(
      { top: 720, bottom: 756, left: 900, right: 936, width: 36, height: 36 },
      { vw: 1280, vh: 800 },
    );
    assert.equal(pos.placement, "above");
    assert.equal(pos.width, DESKTOP_WIDTH);
    assert.ok(pos.top >= VIEWPORT_PAD);
    assert.ok(pos.left >= VIEWPORT_PAD);
    assert.ok(pos.left + pos.width <= 1280 - VIEWPORT_PAD);
    assert.ok(pos.top + pos.height <= 720);
  });

  it("opens below the trigger when there is no room above", () => {
    const pos = computeDesktopPosition(
      { top: 20, bottom: 56, left: 40, right: 76, width: 36, height: 36 },
      { vw: 1100, vh: 700 },
    );
    assert.equal(pos.placement, "below");
    assert.ok(pos.top >= 56);
    assert.ok(pos.top + pos.height <= 700 - VIEWPORT_PAD);
  });

  it("clamps a right-edge trigger so the popup is not clipped", () => {
    const pos = computeDesktopPosition(
      { top: 500, bottom: 536, left: 1240, right: 1276, width: 36, height: 36 },
      { vw: 1280, vh: 800 },
    );
    assert.ok(pos.left + pos.width <= 1280 - VIEWPORT_PAD);
    assert.ok(pos.left >= VIEWPORT_PAD);
  });

  it("sits the mobile sheet above the composer and keyboard", () => {
    const pos = computeMobilePosition(
      { top: 480, bottom: 528, left: 340, right: 378, width: 38, height: 48 },
      {
        innerWidth: 390,
        innerHeight: 844,
        visualViewport: { width: 390, height: 520, offsetTop: 0 },
      },
    );
    assert.ok(pos.bottom >= 844 - 480);
    assert.ok(pos.height <= 520);
    assert.equal(pos.width, 390);
  });
});
