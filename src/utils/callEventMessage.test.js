import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRedialCallEvent,
  formatCallClockTime,
  formatCallEventLabel,
  getCallEventClock,
  getCallRedialMediaType,
  getCallRedialPeerId,
} from "./callEventMessage.js";

const t = (key, vars) => {
  const map = {
    "messenger.calls.chatMissedAudio": "Пропущений аудіодзвінок",
    "messenger.calls.chatMissedVideo": "Пропущений відеодзвінок",
    "messenger.calls.chatCancelledAudio": "Скасований аудіодзвінок",
    "messenger.calls.chatIncomingAudio": "Вхідний аудіодзвінок",
    "messenger.calls.chatOutgoingVideo": "Вихідний відеодзвінок",
    "messenger.calls.chatEndedDuration": `${vars?.type} · ${vars?.duration}`,
  };
  return map[key] || key;
};

describe("call event clock time", () => {
  it("formats ISO UTC into local HH:mm", () => {
    const label = formatCallClockTime("2026-08-16T15:32:00.000Z");
    assert.match(label, /^\d{1,2}:\d{2}/);
  });

  it("does not use Date.now for missing timestamp", () => {
    assert.equal(formatCallClockTime(null), "");
    assert.equal(formatCallClockTime("not-a-date"), "");
  });

  it("keeps clock separate from missed-call label", () => {
    const message = {
      createdAt: "2026-08-16T18:47:20.000Z",
      metadata: {
        callStatus: "MISSED",
        mediaType: "AUDIO",
        startedAt: "2026-08-16T18:47:00.000Z",
      },
    };
    assert.equal(formatCallEventLabel(message, t), "Пропущений аудіодзвінок");
    assert.equal(
      getCallEventClock(message),
      formatCallClockTime("2026-08-16T18:47:00.000Z"),
    );
  });

  it("shows outgoing answered call duration without inline clock", () => {
    const message = {
      senderId: "me",
      metadata: {
        callStatus: "ENDED",
        mediaType: "VIDEO",
        callerId: "me",
        durationSec: 83,
        startedAt: "2026-08-16T12:08:00.000Z",
      },
    };
    assert.equal(
      formatCallEventLabel(message, t, "me"),
      "Вихідний відеодзвінок · 01:23",
    );
    assert.equal(
      getCallEventClock(message),
      formatCallClockTime("2026-08-16T12:08:00.000Z"),
    );
  });
});

describe("call event redial", () => {
  it("allows redial for finished statuses only", () => {
    assert.equal(
      canRedialCallEvent({ metadata: { callStatus: "MISSED" } }),
      true,
    );
    assert.equal(
      canRedialCallEvent({ metadata: { callStatus: "ENDED" } }),
      true,
    );
    assert.equal(
      canRedialCallEvent({ metadata: { callStatus: "REJECTED" } }),
      true,
    );
    assert.equal(
      canRedialCallEvent({ metadata: { callStatus: "CANCELLED" } }),
      true,
    );
    assert.equal(
      canRedialCallEvent({ metadata: { callStatus: "RINGING" } }),
      false,
    );
    assert.equal(
      canRedialCallEvent({ metadata: { callStatus: "ACTIVE" } }),
      false,
    );
  });

  it("uses metadata mediaType enum, not UI text", () => {
    assert.equal(
      getCallRedialMediaType({
        text: "Пропущений аудіодзвінок",
        metadata: { mediaType: "VIDEO", callStatus: "MISSED" },
      }),
      "VIDEO",
    );
    assert.equal(
      getCallRedialMediaType({
        text: "Missed video call",
        metadata: { mediaType: "AUDIO", callStatus: "MISSED" },
      }),
      "AUDIO",
    );
  });

  it("resolves the other participant, not the old caller always", () => {
    const message = {
      metadata: {
        callId: "old-call",
        callerId: "me",
        calleeId: "them",
        mediaType: "AUDIO",
        callStatus: "MISSED",
      },
    };
    assert.equal(getCallRedialPeerId(message, "me"), "them");
    assert.equal(getCallRedialPeerId(message, "them"), "me");
  });
});
