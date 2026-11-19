import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LUNMEYO_ALLOWED_IDS,
  parseLunmeyoStickerId,
} from "../constants/lunmeyoIds.js";
import {
  LUNMEYO_ANIM_ITEMS,
  LUNMEYO_CHARACTERS,
  LUNMEYO_PNG_ITEMS,
} from "../constants/lunmeyoIds.js";
import {
  clipLunmeyoSafe,
  isLunmeyoTokenOnly,
  isStandaloneLunmeyoMessage,
  splitLunmeyoText,
  toLunmeyoToken,
} from "./lunmeyoToken.js";

describe("lunmeyo tokens", () => {
  it("rejects file paths", () => {
    assert.equal(parseLunmeyoStickerId("../lun-happy.png"), null);
    assert.equal(parseLunmeyoStickerId("lun-happy"), "lun-happy");
  });

  it("round-trips a known sticker", () => {
    assert.equal(toLunmeyoToken("lun-oops"), "::lunmeyo:lun-oops::");
    assert.equal(isLunmeyoTokenOnly("::lunmeyo:lun-oops::"), true);
    assert.deepEqual(splitLunmeyoText("hi ::lunmeyo:lun-happy:: !"), [
      { type: "text", value: "hi " },
      { type: "sticker", id: "lun-happy" },
      { type: "text", value: " !" },
    ]);
  });

  it("keeps png and animation ids unique", () => {
    assert.equal(LUNMEYO_ALLOWED_IDS.has("lun-coffee"), true);
    assert.equal(LUNMEYO_ALLOWED_IDS.has("lun-coffee-anim"), true);
    assert.equal(LUNMEYO_ALLOWED_IDS.size, 37);
    assert.equal(LUNMEYO_PNG_ITEMS.length, 30);
    assert.equal(LUNMEYO_ANIM_ITEMS.length, 7);
    assert.ok(LUNMEYO_PNG_ITEMS.some((item) => item.character === LUNMEYO_CHARACTERS.LUN));
    assert.ok(LUNMEYO_PNG_ITEMS.some((item) => item.character === LUNMEYO_CHARACTERS.ROUND));
    assert.ok(LUNMEYO_ANIM_ITEMS.some((item) => item.character === LUNMEYO_CHARACTERS.LUN));
    assert.ok(LUNMEYO_ANIM_ITEMS.some((item) => item.character === LUNMEYO_CHARACTERS.ROUND));
  });

  it("treats metadata-only chat rows as standalone stickers", () => {
    assert.equal(
      isStandaloneLunmeyoMessage({
        metadata: { lunmeyoStickerId: "lun-love-anim" },
        text: "",
      }),
      true,
    );
    assert.equal(
      isStandaloneLunmeyoMessage({
        text: "::lunmeyo:lun-happy::",
        attachments: [{ url: "x" }],
      }),
      false,
    );
  });

  it("does not leave a clipped token in post previews", () => {
    assert.equal(clipLunmeyoSafe("hello ::lunmeyo:lun-ha"), "hello");
    assert.equal(
      clipLunmeyoSafe("hello ::lunmeyo:lun-happy::"),
      "hello ::lunmeyo:lun-happy::",
    );
  });
});
