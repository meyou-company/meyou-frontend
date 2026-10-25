import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONNECTION_TAB_IDS,
  CONNECTION_TABS,
  actionForConnectionTab,
  normalizeConnectionCounts,
} from "./connectionTabs.js";

describe("connectionTabs", () => {
  it("has four exclusive friends-page tabs", () => {
    assert.deepEqual(CONNECTION_TAB_IDS, [
      "friends",
      "followers",
      "following",
      "vip",
    ]);
    assert.equal(CONNECTION_TABS.length, 4);
  });

  it("maps follow-back and unfollow without a VIP unfollow action", () => {
    assert.equal(actionForConnectionTab("followers"), "subscribe");
    assert.equal(actionForConnectionTab("following"), "unsubscribe");
    assert.equal(actionForConnectionTab("friends"), "unsubscribe");
    assert.equal(actionForConnectionTab("vip"), null);
  });

  it("normalizes connection counts", () => {
    assert.deepEqual(normalizeConnectionCounts({ friends: 2, vip: 1 }), {
      friends: 2,
      followers: 0,
      following: 0,
      vip: 1,
    });
  });
});
