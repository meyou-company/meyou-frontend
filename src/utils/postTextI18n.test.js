import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const localesDir = join(dirname(fileURLToPath(import.meta.url)), "../i18n/locales");
const files = ["en", "uk", "ru", "fr", "es", "tr", "cs", "ar"];

describe("post length copy", () => {
  it("has 5000-character, read more, and collapse strings in all locales", () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), "utf8"));
      assert.ok(json.errors.POST_FULL_TEXT_TOO_LONG, name);
      assert.ok(json.posts.validation.tooLong, name);
      assert.ok(json.posts.readMore.trim().length > 1, name);
      assert.ok(json.posts.collapse.trim().length > 1, name);
      assert.notEqual(json.posts.readMore, json.posts.collapse, name);
    }
  });
});
