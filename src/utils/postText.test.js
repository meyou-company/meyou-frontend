import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clipPostChars,
  countPostChars,
  formatPostCharCounter,
  getPostTextPreview,
  isPostFullTextTooLong,
  POST_FULL_TEXT_MAX,
  POST_SHORT_TEXT_MAX,
  shouldExpandPostText,
} from "./postText.js";

const COMPLEX_EMOJI = ["❤️", "🫶🏻", "👨‍👩‍👧‍👦", "🇺🇦"];

describe("countPostChars", () => {
  it("uses Unicode code points so emoji match the backend limit", () => {
    assert.equal(countPostChars("😀"), 1);
    assert.notEqual("😀".length, 1);
    assert.equal(countPostChars("Anička"), 6);
    assert.equal(countPostChars("Київ"), 4);
    assert.equal(countPostChars("a\n\nb"), 4);
  });
});

describe("feed preview / expand", () => {
  it("shows 199 and 200 characters in full without expand", () => {
    assert.equal(shouldExpandPostText("a".repeat(199)), false);
    assert.equal(shouldExpandPostText("a".repeat(200)), false);
    assert.equal(shouldExpandPostText("ř".repeat(POST_SHORT_TEXT_MAX)), false);
  });

  it("previews the first 200 characters when longer", () => {
    const text = "a".repeat(201);
    assert.equal(shouldExpandPostText(text), true);
    assert.equal(getPostTextPreview(text), "a".repeat(200));
    assert.equal(countPostChars(getPostTextPreview(text)), 200);
  });

  it("keeps paragraphs in the stored full text preview clip", () => {
    const text = `${"a".repeat(100)}\n\n${"b".repeat(120)}`;
    const preview = getPostTextPreview(text);
    assert.match(preview, /\n\n/);
    assert.equal(countPostChars(preview), 200);
  });

  for (const emoji of COMPLEX_EMOJI) {
    it(`does not split ${emoji} at the 200-character preview boundary`, () => {
      const text = `${"a".repeat(199)}${emoji} more`;
      const preview = getPostTextPreview(text);
      assert.equal(preview, "a".repeat(199));
      assert.equal(preview.includes(emoji), false);
      assert.equal(shouldExpandPostText(text), true);
    });

    it(`keeps a leading ${emoji} in the preview`, () => {
      const text = `${emoji}${"b".repeat(200)}`;
      const preview = getPostTextPreview(text);
      assert.equal(preview.startsWith(emoji), true);
      assert.ok(countPostChars(preview) <= POST_SHORT_TEXT_MAX);
    });
  }

  it("counts complex emoji as multiple code points toward the 5000 limit", () => {
    assert.equal(countPostChars("❤️"), 2);
    assert.equal(countPostChars("🫶🏻"), 2);
    assert.equal(countPostChars("👨‍👩‍👧‍👦"), 7);
    assert.equal(countPostChars("🇺🇦"), 2);
    assert.equal(isPostFullTextTooLong("❤️".repeat(2500)), false);
    assert.equal(isPostFullTextTooLong("❤️".repeat(2501)), true);
  });
});

describe("full text limit", () => {
  it("allows 4999 and 5000, rejects 5001", () => {
    assert.equal(isPostFullTextTooLong("я".repeat(4999)), false);
    assert.equal(isPostFullTextTooLong("я".repeat(5000)), false);
    assert.equal(isPostFullTextTooLong("я".repeat(5001)), true);
    assert.equal(isPostFullTextTooLong("😀".repeat(POST_FULL_TEXT_MAX + 1)), true);
  });

  it("formats the composer counter with a thousands space", () => {
    assert.equal(formatPostCharCounter(0), "0 / 5 000");
    assert.equal(formatPostCharCounter(200), "200 / 5 000");
    assert.equal(formatPostCharCounter(5001, POST_FULL_TEXT_MAX), "5 001 / 5 000");
  });
});
