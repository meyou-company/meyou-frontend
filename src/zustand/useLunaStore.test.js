import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useLunaStore.js"),
  "utf8",
);

describe("luna conversation store", () => {
  it("creates, opens, clears, and deletes through the conversation APIs", () => {
    assert.match(source, /lunaApi\.createConversation/);
    assert.match(source, /async openConversation/);
    assert.match(source, /lunaApi\.clearConversation/);
    assert.match(source, /lunaApi\.deleteConversation/);
    assert.match(source, /lunaApi\.getSession\(requested/);
  });

  it("requires confirmation before clear, delete, or a new chat with a draft", () => {
    assert.match(source, /confirm: \{ kind: "clear" \}/);
    assert.match(source, /confirm: \{ kind: "delete"/);
    assert.match(source, /confirm: \{ kind: "newChat" \}/);
    assert.match(source, /hasUnsentDraft\(draftText, draftHasPhoto\)/);
  });

  it("keeps sends scoped to the active conversation", () => {
    assert.match(source, /conversationId: conversationId \|\| undefined/);
    assert.match(source, /bindLunaTabSync|broadcastLunaSync/);
  });
});
