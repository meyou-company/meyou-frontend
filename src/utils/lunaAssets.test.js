import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lunaAvatarSrc,
  lunaGreetingSrc,
  lunaStickerSrc,
  lunaThinkSrc,
  normalizeLunaAppearance,
} from "./lunaAssets.js";

describe("luna assets", () => {
  it("maps looks to avatar files", () => {
    assert.equal(lunaAvatarSrc("MOON"), "/luna/moon/avatar.png");
    assert.equal(lunaAvatarSrc("ROBOT"), "/luna/robot/avatar.png");
    assert.equal(normalizeLunaAppearance("FOX"), null);
  });

  it("never uses arbitrary image URLs from the model", () => {
    assert.equal(lunaStickerSrc("MOON", "https://evil.example/x.gif"), null);
    assert.equal(lunaStickerSrc("MOON", "hello"), "/luna/moon/hello.png");
    assert.equal(lunaStickerSrc("ROBOT", "hello"), "/luna/robot/hello.png");
    assert.equal(lunaStickerSrc("MOON", "laugh"), null);
    assert.equal(lunaStickerSrc("ROBOT", "laugh"), null);
  });

  it("does not fall back to the other character when a sticker is unknown", () => {
    assert.equal(lunaStickerSrc("MOON", "unknown-dance"), null);
    assert.equal(lunaStickerSrc(null, "laugh"), null);
  });

  it("does not invent greeting or thinking GIFs that are not in the repo", () => {
    assert.equal(lunaGreetingSrc("MOON"), null);
    assert.equal(lunaThinkSrc("ROBOT"), null);
  });
});
