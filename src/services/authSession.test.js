import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyAuthFromSession,
  pickAccessToken,
  readOAuthCodeFromQuery,
} from "./authSession.js";

describe("authSession security helpers", () => {
  it("pickAccessToken normalizes snake_case", () => {
    expect(pickAccessToken({ access_token: "a" })).toBe("a");
    expect(pickAccessToken({ accessToken: "b" })).toBe("b");
  });

  it("applyAuthFromSession does not set isAuthed without access token", () => {
    const setAuth = vi.fn();
    const result = applyAuthFromSession(setAuth, { id: "1" }, null);
    expect(result).toBeNull();
    expect(setAuth).not.toHaveBeenCalled();
  });

  it("applyAuthFromSession sets user, token, isAuthed when JWT present", () => {
    const setAuth = vi.fn();
    applyAuthFromSession(setAuth, { id: "1" }, "jwt.access");
    expect(setAuth).toHaveBeenCalledWith({
      user: { id: "1" },
      token: "jwt.access",
      isAuthed: true,
    });
  });
});

describe("readOAuthCodeFromQuery", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { search: "" };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("reads oauth_code and not legacy token params", () => {
    window.location.search =
      "?oauth_code=550e8400-e29b-41d4-a716-446655440000";
    expect(readOAuthCodeFromQuery()).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    window.location.search = "?access_token=secret&refresh_token=secret";
    expect(readOAuthCodeFromQuery()).toBeNull();
  });
});