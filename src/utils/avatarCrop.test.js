import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVATAR_CROP_ZOOM,
  AVATAR_OUTPUT_SIZE,
  getAvatarCropDrawRect,
  getAvatarCropZoomConfig,
  getCoverDrawRect,
  getFillDrawRect,
  getFitDrawRect,
  normalizeAvatarCropMode,
} from "./avatarCrop.js";

describe("avatar crop modes", () => {
  it("defaults unknown modes to fill", () => {
    assert.equal(normalizeAvatarCropMode("fit"), "fit");
    assert.equal(normalizeAvatarCropMode("fill"), "fill");
    assert.equal(normalizeAvatarCropMode(undefined), "fill");
  });

  it("lets fit zoom below 1 so portraits can show more than a face crop", () => {
    const fill = getAvatarCropZoomConfig("fill");
    const fit = getAvatarCropZoomConfig("fit");

    assert.equal(fill.min, 1);
    assert.equal(fill.objectFit, "cover");
    assert.equal(fill.restrictPosition, true);
    assert.ok(fill.max > fill.min);

    assert.ok(fit.min < 1);
    assert.ok(fit.max > 1);
    assert.equal(fit.objectFit, "contain");
    assert.equal(fit.restrictPosition, false);
    assert.ok(fit.min < fill.min);
    assert.equal(AVATAR_CROP_ZOOM.fit.min, 0.5);
  });
});

describe("fill crop mapping", () => {
  it("maps a vertical center square onto the full avatar output", () => {
    const rect = getFillDrawRect(1080, 1920, { x: 0, y: 420, width: 1080, height: 1080 }, 512);
    assert.equal(rect.sx, 0);
    assert.equal(rect.sy, 420);
    assert.equal(rect.sw, 1080);
    assert.equal(rect.sh, 1080);
    assert.equal(rect.dx, 0);
    assert.equal(rect.dy, 0);
    assert.equal(rect.dw, 512);
    assert.equal(rect.dh, 512);
    assert.equal(rect.hasLetterbox, false);
  });

  it("maps a horizontal center square onto the full avatar output", () => {
    const rect = getFillDrawRect(1920, 1080, { x: 420, y: 0, width: 1080, height: 1080 }, 512);
    assert.equal(rect.sx, 420);
    assert.equal(rect.sy, 0);
    assert.equal(rect.sw, 1080);
    assert.equal(rect.sh, 1080);
    assert.equal(rect.dx, 0);
    assert.equal(rect.dy, 0);
    assert.equal(rect.dw, 512);
  });

  it("clamps a slightly out-of-bounds fill crop instead of letterboxing", () => {
    const rect = getFillDrawRect(100, 100, { x: -4, y: 0, width: 104, height: 100 }, 512);
    assert.equal(rect.sx, 0);
    assert.equal(rect.sy, 0);
    assert.equal(rect.sw, 100);
    assert.equal(rect.sh, 100);
    assert.equal(rect.dx, 0);
    assert.equal(rect.dy, 0);
    assert.equal(rect.dw, 512);
    assert.equal(rect.dh, 512);
  });
});

describe("fit crop mapping", () => {
  it("places a vertical photo inside the circle and leaves side bands for blur", () => {
    const crop = { x: -420, y: 0, width: 1920, height: 1920 };
    const rect = getFitDrawRect(1080, 1920, crop, 512);

    assert.equal(rect.sx, 0);
    assert.equal(rect.sy, 0);
    assert.equal(rect.sw, 1080);
    assert.equal(rect.sh, 1920);
    assert.ok(rect.hasLetterbox);
    assert.ok(rect.dx > 100 && rect.dx < 130);
    assert.equal(rect.dy, 0);
    assert.ok(rect.dw > 270 && rect.dw < 300);
    assert.equal(rect.dh, 512);
    assert.ok(rect.dx + rect.dw < 512);
  });

  it("places a horizontal photo inside the circle and leaves top/bottom bands for blur", () => {
    const crop = { x: 0, y: -420, width: 1920, height: 1920 };
    const rect = getFitDrawRect(1920, 1080, crop, 512);

    assert.equal(rect.sx, 0);
    assert.equal(rect.sy, 0);
    assert.equal(rect.sw, 1920);
    assert.equal(rect.sh, 1080);
    assert.ok(rect.hasLetterbox);
    assert.equal(rect.dx, 0);
    assert.ok(rect.dy > 100 && rect.dy < 130);
    assert.equal(rect.dw, 512);
    assert.ok(rect.dh > 270 && rect.dh < 300);
  });

  it("does not letterbox a square photo that already fills the crop", () => {
    const rect = getFitDrawRect(1080, 1080, { x: 0, y: 0, width: 1080, height: 1080 }, 512);
    assert.equal(rect.hasLetterbox, false);
    assert.equal(rect.dx, 0);
    assert.equal(rect.dy, 0);
    assert.equal(rect.dw, 512);
    assert.equal(rect.dh, 512);
  });

  it("shrinks a zoomed-out portrait with padding on every side", () => {
    const crop = { x: -960, y: -540, width: 3000, height: 3000 };
    const rect = getFitDrawRect(1080, 1920, crop, 512);

    assert.ok(rect.hasLetterbox);
    assert.ok(rect.dx > 140);
    assert.ok(rect.dy > 70);
    assert.ok(rect.dx + rect.dw < 400);
    assert.ok(rect.dy + rect.dh < 480);
  });
});

describe("cover blur source", () => {
  it("covers a portrait onto a square without empty edges", () => {
    const rect = getCoverDrawRect(1080, 1920, 512);
    assert.equal(rect.dw, 512);
    assert.ok(rect.dh > 512);
    assert.ok(rect.dy < 0);
  });
});

describe("mode dispatch", () => {
  it("keeps a consistent square output size for avatars", () => {
    assert.equal(AVATAR_OUTPUT_SIZE, 512);
    const fill = getAvatarCropDrawRect(1080, 1920, { x: 0, y: 420, width: 1080, height: 1080 }, 512, "fill");
    const fit = getAvatarCropDrawRect(1080, 1920, { x: -420, y: 0, width: 1920, height: 1920 }, 512, "fit");
    assert.equal(fill.dw, 512);
    assert.equal(fill.dh, 512);
    assert.equal(fit.hasLetterbox, true);
  });
});
