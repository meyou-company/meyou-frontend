import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  LUNA_MENU_MAX_WIDTH_PX,
  LUNA_MENU_WIDTH_PX,
  placeLunaMenu,
} from "./lunaMenu.js";

const scss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/Luna/LunaWidget.scss"),
  "utf8",
);

describe("luna overflow menu placement", () => {
  it("keeps a compact width aligned to the trigger’s right edge", () => {
    const placed = placeLunaMenu(
      { top: 24, bottom: 68, left: 900, right: 944 },
      { width: 1280, height: 800 },
    );
    assert.equal(placed.width, LUNA_MENU_WIDTH_PX);
    assert.ok(placed.width >= 260 && placed.width <= LUNA_MENU_MAX_WIDTH_PX);
    assert.equal(placed.left + placed.width, 944);
    assert.equal(placed.top, 75);
    assert.ok(placed.left + placed.width <= 1280);
  });

  it("never inherits the viewport or Luna panel width", () => {
    const wide = placeLunaMenu(
      { top: 20, bottom: 64, left: 10, right: 54 },
      { width: 1900, height: 900 },
    );
    assert.ok(wide.width <= LUNA_MENU_MAX_WIDTH_PX);
    assert.ok(wide.width < 400);
    const mobile = placeLunaMenu(
      { top: 12, bottom: 56, left: 300, right: 360 },
      { width: 390, height: 844 },
    );
    assert.ok(mobile.width <= 390 - 16);
    assert.ok(mobile.left >= 8);
    assert.ok(mobile.left + mobile.width <= 390 - 8);
  });
});

describe("luna overflow menu styles", () => {
  it("pins a compact portaled menu and keeps the Luna panel at 40vw", () => {
    assert.match(scss, /\.lunaMenu \{/);
    assert.match(scss, /width:\s*280px;/);
    assert.match(scss, /max-width:\s*300px;/);
    assert.match(scss, /max-width:\s*calc\(100vw - 16px\)/);
    assert.doesNotMatch(scss, /\.lunaMenu \{[^}]*width:\s*100%/);
    assert.match(scss, /@media \(min-width: 1025px\)[\s\S]*?\.lunaPanel \{[\s\S]*?width: 40vw;/);
  });
});
