import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyAuthFromSession,
  pickAccessToken,
  takeOAuthCodeFromQuery,
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

describe("takeOAuthCodeFromQuery", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = {
      pathname: "/auth/google/success",
      search: "",
    };
    window.history.replaceState = vi.fn((_state, _title, path) => {
      window.location.pathname = path;
      window.location.search = "";
    });
    Object.defineProperty(document, "title", {
      writable: true,
      value: "LunMeYo",
    });
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("returns code and strips query via replaceState", () => {
    window.location.search =
      "?oauth_code=550e8400-e29b-41d4-a716-446655440000";
    const code = takeOAuthCodeFromQuery();
    expect(code).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      "LunMeYo",
      "/auth/google/success",
    );
    expect(readOAuthCodeFromQuery()).toBeNull();
  });

  it("does not treat legacy token query as oauth code", () => {
    window.location.search = "?access_token=secret&refresh_token=secret";
    expect(takeOAuthCodeFromQuery()).toBeNull();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});