import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPublishWithSoundtrack,
  clampClip,
  createSoundtrackSelection,
  defaultClip,
  formatArtists,
  normalizeTrackLengthSec,
} from "./soundtrackClip.js";

describe("soundtrackClip", () => {
  it("treats large length values as milliseconds", () => {
    assert.equal(normalizeTrackLengthSec(178000), 178);
    assert.equal(normalizeTrackLengthSec(178), 178);
  });

  it("defaults the clip to the first 15 seconds", () => {
    assert.deepEqual(defaultClip(120), { startSec: 0, endSec: 15 });
    assert.deepEqual(defaultClip(8), { startSec: 0, endSec: 8 });
  });

  it("keeps a usable clip inside the track length", () => {
    assert.deepEqual(
      clampClip({ startSec: 10, endSec: 12, lengthSec: 20 }),
      { startSec: 10, endSec: 12 },
    );
    const short = clampClip({ startSec: 19.5, endSec: 19.6, lengthSec: 20 });
    assert.ok(short.endSec - short.startSec >= 0.5);
  });

  it("blocks publish while an Epidemic track is selected", () => {
    assert.equal(canPublishWithSoundtrack(null), true);
    assert.equal(canPublishWithSoundtrack({ id: "0zZPY3heqS" }), false);
  });

  it("stores real track metadata for the editor overlay", () => {
    const selected = createSoundtrackSelection({
      id: "0zZPY3heqS",
      title: "Night Drive",
      artists: ["Luna Park"],
      imageUrl: "https://cdn.example/cover.jpg",
      lengthSec: 178,
    });
    assert.equal(selected.id, "0zZPY3heqS");
    assert.equal(selected.title, "Night Drive");
    assert.equal(formatArtists(selected.artists), "Luna Park");
    assert.equal(selected.startSec, 0);
    assert.equal(selected.endSec, 15);
  });
});
