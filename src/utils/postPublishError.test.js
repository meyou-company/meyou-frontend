import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPostPublishFailureToast } from "./postPublishError.js";

function t(key) {
  return {
    "posts.toast.editMediaUploadFileFailed": "Could not upload one of the files",
    "posts.toast.publishFailed": "Could not publish post",
  }[key];
}

describe("getPostPublishFailureToast", () => {
  it("keeps upload failures labeled as file upload errors", () => {
    const message = getPostPublishFailureToast({
      phase: "upload",
      details: "Internal server error.",
      t,
    });
    assert.match(message, /Could not upload one of the files/);
    assert.match(message, /Internal server error/);
  });

  it("does not blame photo upload when POST /posts fails", () => {
    const message = getPostPublishFailureToast({
      phase: "create",
      details: "Внутрішня помилка сервера.",
      t,
    });
    assert.equal(message, "Внутрішня помилка сервера.");
    assert.doesNotMatch(message, /upload one of the files/i);
  });

  it("falls back to publishFailed when create has no details", () => {
    const message = getPostPublishFailureToast({
      phase: "create",
      details: "",
      t,
    });
    assert.equal(message, "Could not publish post");
  });
});
