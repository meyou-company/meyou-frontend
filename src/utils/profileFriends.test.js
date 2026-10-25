import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getOwnProfileFriendsCount } from "./profileFriends.js";

describe("getOwnProfileFriendsCount", () => {
  it("uses classified friends count even when the preview list is empty", () => {
    assert.equal(getOwnProfileFriendsCount(4, 0), 4);
  });

  it("does not treat following totals as friends", () => {
    assert.equal(getOwnProfileFriendsCount(0, 1), 0);
  });

  it("falls back to preview length only before classified counts arrive", () => {
    assert.equal(getOwnProfileFriendsCount(undefined, 2), 2);
    assert.equal(getOwnProfileFriendsCount(null, 0), 0);
  });
});
