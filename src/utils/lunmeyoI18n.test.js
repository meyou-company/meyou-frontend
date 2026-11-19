import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const localesDir = join(dirname(fileURLToPath(import.meta.url)), "../i18n/locales");
const files = ["en", "uk", "ru", "fr", "es", "tr", "cs", "ar"];
const keys = [
  ["tabs", "emoji"],
  ["tabs", "stickers"],
  ["tabs", "animations"],
  ["charactersLabel"],
  ["characters", "lun"],
  ["characters", "round"],
  ["sticker"],
  ["animation"],
  ["empty"],
  ["removeSticker"],
];

function readKey(obj, path) {
  return path.reduce((acc, key) => acc?.[key], obj);
}

describe("lunmeyo i18n", () => {
  it("has picker copy in all locales", () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), "utf8"));
      for (const path of keys) {
        assert.ok(readKey(json.lunmeyo, path), `${name}.lunmeyo.${path.join(".")}`);
      }
    }
  });
});
