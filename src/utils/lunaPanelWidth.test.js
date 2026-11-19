import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const scss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/Luna/LunaWidget.scss"),
  "utf8",
);

describe("luna panel width", () => {
  it("uses 40vw on desktop screens wider than 1024px", () => {
    assert.match(scss, /@media \(min-width: 1025px\)[\s\S]*?\.lunaPanel \{[\s\S]*?width: 40vw;/);
    assert.match(scss, /@media \(min-width: 1025px\)[\s\S]*?\.lunaPanel \{[\s\S]*?max-width: none;/);
  });

  it("keeps a fullscreen panel on mobile and a clamped width for tablets", () => {
    assert.match(scss, /@media \(max-width: 768px\)[\s\S]*?\.lunaPanel \{[\s\S]*?width: 100%;/);
    assert.match(scss, /width: clamp\(380px, 28vw, 420px\)/);
  });
});
