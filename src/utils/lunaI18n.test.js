import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const localesDir = join(dirname(fileURLToPath(import.meta.url)), "../i18n/locales");
const files = ["en", "uk", "ru", "fr", "es", "tr", "cs", "ar"];
const lunaKeys = [
  "fabLabel",
  "fabAria",
  "name",
  "subtitle",
  "demoBanner",
  "pickerTitle",
  "pickerStart",
  "moonTitle",
  "robotTitle",
  "changeLook",
  "emptyHello",
  "placeholder",
  "thinking",
  "pauseAnimation",
  "error",
  "retry",
  "attachPhoto",
  "removePhoto",
  "recordVoice",
  "stopRecording",
  "cancelRecording",
  "recording",
  "transcribing",
];
const errorKeys = [
  "LUNA_MESSAGE_EMPTY",
  "LUNA_MESSAGE_TOO_LONG",
  "LUNA_APPEARANCE_REQUIRED",
  "LUNA_DAILY_LIMIT",
  "LUNA_MONTHLY_LIMIT",
  "LUNA_BUDGET_EXCEEDED",
  "LUNA_BUSY",
  "LUNA_MEDIA_UNAVAILABLE",
  "LUNA_IMAGE_INVALID",
  "LUNA_IMAGE_TOO_LARGE",
  "LUNA_AUDIO_INVALID",
  "LUNA_AUDIO_TOO_LONG",
];

describe("luna i18n", () => {
  it("has assistant copy and error codes in all locales", () => {
    for (const name of files) {
      const json = JSON.parse(readFileSync(join(localesDir, `${name}.json`), "utf8"));
      for (const key of lunaKeys) {
        assert.ok(json.luna?.[key], `${name}.luna.${key}`);
      }
      assert.ok(json.luna.prompts.site, `${name}.luna.prompts.site`);
      assert.ok(json.luna.promptMessages.chat, `${name}.luna.promptMessages.chat`);
      for (const key of errorKeys) {
        assert.ok(json.errors[key], `${name}.errors.${key}`);
      }
    }
  });
});
