import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addLunmeyoComposerSticker,
  clampLunmeyoComposer,
  parseLunmeyoComposer,
  removeLunmeyoComposerSticker,
  replaceLunmeyoComposerDisplay,
  serializeLunmeyoComposer,
} from "./lunmeyoComposer.js";

describe("lunmeyo composer", () => {
  it("hides tokens from the visible draft and keeps them in storage", () => {
    const stored = serializeLunmeyoComposer("hello", ["lun-happy", "lun-oops"]);
    assert.match(stored, /::lunmeyo:lun-happy::/);
    assert.match(stored, /::lunmeyo:lun-oops::/);
    const { displayText, stickerIds } = parseLunmeyoComposer(stored);
    assert.equal(displayText.includes("::lunmeyo:"), false);
    assert.equal(displayText.trim(), "hello");
    assert.deepEqual(stickerIds, ["lun-happy", "lun-oops"]);
  });

  it("lets the user type without dropping selected stickers", () => {
    const stored = addLunmeyoComposerSticker("hi", "lun-love");
    const next = replaceLunmeyoComposerDisplay(stored, "hi there");
    assert.equal(parseLunmeyoComposer(next).displayText, "hi there");
    assert.deepEqual(parseLunmeyoComposer(next).stickerIds, ["lun-love"]);
  });

  it("captures a pasted token as a sticker chip instead of raw text", () => {
    const next = replaceLunmeyoComposerDisplay("hi", "wow ::lunmeyo:lun-wave::");
    assert.equal(parseLunmeyoComposer(next).displayText, "wow");
    assert.deepEqual(parseLunmeyoComposer(next).stickerIds, ["lun-wave"]);
    assert.equal(next.includes("::lunmeyo:lun-wave::"), true);
  });

  it("removes one sticker and keeps the rest", () => {
    const stored = serializeLunmeyoComposer("ok", ["lun-happy", "lun-oops"]);
    const next = removeLunmeyoComposerSticker(stored, 0);
    assert.deepEqual(parseLunmeyoComposer(next).stickerIds, ["lun-oops"]);
    assert.equal(parseLunmeyoComposer(next).displayText, "ok");
  });

  it("rejects unknown ids", () => {
    assert.equal(addLunmeyoComposerSticker("hi", "../secret.png"), "hi");
  });

  it("clamps live drafts without exposing a token fragment", () => {
    const stored = addLunmeyoComposerSticker("x".repeat(280), "lun-love-anim");
    const clamped = clampLunmeyoComposer(stored, 300);
    assert.equal(clamped.includes("::lunmeyo:"), true);
    assert.equal(clamped.length <= 300, true);
    assert.equal(parseLunmeyoComposer(clamped).displayText.includes("::"), false);
  });
});
