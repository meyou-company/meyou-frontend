import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const localesDir = join(dirname(fileURLToPath(import.meta.url)), "../i18n/locales");
const files = ["en", "uk", "ru", "fr", "es", "tr", "cs", "ar"];
const requiredKeys = ["title", "zoom", "fill", "fit", "preview", "done"];

describe("avatar crop copy", () => {
  it("has editor strings in all locales", () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), "utf8"));
      const crop = json.profile.avatarCrop;
      assert.ok(crop, name);
      for (const key of requiredKeys) {
        assert.equal(typeof crop[key], "string", `${name}.${key}`);
        assert.ok(crop[key].trim().length > 1, `${name}.${key}`);
      }
      assert.notEqual(crop.fill, crop.fit, name);
    }
  });
});
