import { describe, it, expect, vi, beforeEach } from "vitest";

const postSessionRefresh = vi.hoisted(() => vi.fn());

vi.mock("./api", () => ({
  postSessionRefresh,
  api: {},
}));

import { authApi } from "./auth.js";

describe("authApi.refresh", () => {
  beforeEach(() => {
    postSessionRefresh.mockReset();
  });

  it("uses centralized postSessionRefresh", async () => {
    postSessionRefresh.mockResolvedValue({
      data: { accessToken: "at", refreshToken: "rt" },
    });
    const data = await authApi.refresh();
    expect(postSessionRefresh).toHaveBeenCalledTimes(1);
    expect(data.accessToken).toBe("at");
  });

  it("surfaces errors from postSessionRefresh without extra side effects", async () => {
    const err = {
      response: { status: 409, data: { code: "REFRESH_PARALLEL" } },
    };
    postSessionRefresh.mockRejectedValue(err);
    await expect(authApi.refresh()).rejects.toEqual(err);
    expect(postSessionRefresh).toHaveBeenCalledTimes(1);
  });
});