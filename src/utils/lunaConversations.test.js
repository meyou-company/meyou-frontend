import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLunaSession,
  conversationDisplayTitle,
  hasUnsentDraft,
  supportsLunaConversations,
} from "./lunaConversations.js";

describe("luna conversations helpers", () => {
  it("treats missing conversations as the old single-thread API", () => {
    assert.equal(supportsLunaConversations({ messages: [] }), false);
    assert.equal(supportsLunaConversations({ conversations: [] }), true);
    const oldApi = applyLunaSession({
      appearance: "MOON",
      demo: true,
      messages: [{ id: "m1", text: "Hi" }],
    });
    assert.equal(oldApi.supportsConversations, false);
    assert.equal(oldApi.conversationId, null);
    assert.equal(oldApi.messages[0].text, "Hi");
  });

  it("keeps the opened conversation from a new API session", () => {
    const session = applyLunaSession({
      appearance: "ROBOT",
      conversations: [
        { id: "c2", title: "Later" },
        { id: "c1", title: "Hello Luna" },
      ],
      conversation: { id: "c1", title: "Hello Luna" },
      messages: [{ id: "m1", text: "Hello Luna" }],
    });
    assert.equal(session.supportsConversations, true);
    assert.equal(session.conversationId, "c1");
    assert.equal(session.conversations.length, 2);
  });

  it("uses title, then preview, then untitled", () => {
    assert.equal(conversationDisplayTitle({ title: "Site help" }, "New chat"), "Site help");
    assert.equal(
      conversationDisplayTitle({ title: "  ", preview: "Translate this" }, "New chat"),
      "Translate this",
    );
    assert.equal(conversationDisplayTitle({}, "Нова розмова"), "Нова розмова");
  });

  it("requires confirmation when the composer has a draft", () => {
    assert.equal(hasUnsentDraft("  hello ", false), true);
    assert.equal(hasUnsentDraft("", true), true);
    assert.equal(hasUnsentDraft("   ", false), false);
  });
});
