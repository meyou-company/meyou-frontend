import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "lunaApi.js"),
  "utf8",
);

describe("luna conversation API client", () => {
  it("exposes create, open, search, clear, and delete endpoints", () => {
    assert.match(source, /\/luna\/conversations/);
    assert.match(source, /\/luna\/conversations\/\$\{id\}/);
    assert.match(source, /\/luna\/conversations\/\$\{id\}\/messages/);
    assert.match(source, /createConversation/);
    assert.match(source, /clearConversation/);
    assert.match(source, /deleteConversation/);
    assert.match(source, /searchConversation/);
    assert.match(source, /conversationId/);
  });
});
