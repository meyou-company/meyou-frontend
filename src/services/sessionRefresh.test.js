import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  REFRESH_PARALLEL_CODE,
  SESSION_REFRESH_DEDUPE_KEY,
  isRefreshParallelConflict,
  withRefreshParallelRetry,
  dedupedSessionRefresh,
} from "./sessionRefresh";

function parallelErr() {
  return {
    response: { status: 409, data: { code: REFRESH_PARALLEL_CODE } },
  };
}

describe("sessionRefresh", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("detects REFRESH_PARALLEL conflicts", () => {
    expect(isRefreshParallelConflict(parallelErr())).toBe(true);
    expect(
      isRefreshParallelConflict({ response: { status: 401, data: {} } }),
    ).toBe(false);
  });

  it("withRefreshParallelRetry succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRefreshParallelRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("withRefreshParallelRetry retries 409 then succeeds", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(parallelErr())
      .mockRejectedValueOnce(parallelErr())
      .mockResolvedValue("tokens");
    const p = withRefreshParallelRetry(fn, { maxAttempts: 4 });
    await vi.advanceTimersByTimeAsync(150);
    await vi.advanceTimersByTimeAsync(300);
    await expect(p).resolves.toBe("tokens");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("withRefreshParallelRetry does not retry non-409 errors", async () => {
    const unauthorized = { response: { status: 401, data: { code: "X" } } };
    const fn = vi.fn().mockRejectedValue(unauthorized);
    await expect(withRefreshParallelRetry(fn)).rejects.toBe(unauthorized);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("withRefreshParallelRetry stops after maxAttempts", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(parallelErr());
    const p = withRefreshParallelRetry(fn, { maxAttempts: 2 });
    const assert = expect(p).rejects.toEqual(parallelErr());
    await vi.advanceTimersByTimeAsync(200);
    await assert;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("dedupedSessionRefresh shares one in-flight promise", async () => {
    let resolves;
    const deferred = new Promise((r) => {
      resolves = r;
    });
    const fn = vi.fn(() => deferred);
    const a = dedupedSessionRefresh(fn);
    const b = dedupedSessionRefresh(fn);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    resolves("shared");
    await expect(a).resolves.toBe("shared");
    await expect(b).resolves.toBe("shared");
    void SESSION_REFRESH_DEDUPE_KEY;
  });
});