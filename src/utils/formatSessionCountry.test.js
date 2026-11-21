import { describe, it, expect, vi } from "vitest";
import {
  formatRegionDisplayName,
  formatSessionCountryLabel,
  uiLocaleToBcp47,
} from "./formatSessionCountry.js";

describe("uiLocaleToBcp47", () => {
  it("maps supported LUNMEYO locales", () => {
    expect(uiLocaleToBcp47("uk")).toBe("uk");
    expect(uiLocaleToBcp47("en-US")).toBe("en");
    expect(uiLocaleToBcp47("cs")).toBe("cs");
  });
});

describe("formatRegionDisplayName", () => {
  it("resolves CZ, UA, US", () => {
    expect(formatRegionDisplayName("CZ", "uk")).toBe("Чехія");
    expect(formatRegionDisplayName("CZ", "en")).toBe("Czechia");
    expect(formatRegionDisplayName("CZ", "cs")).toBe("Česko");
    expect(formatRegionDisplayName("CZ", "ru")).toBe("Чехия");
    expect(formatRegionDisplayName("UA", "en")).toBe("Ukraine");
    expect(formatRegionDisplayName("US", "en")).toBe("United States");
  });

  it("returns null for unknown or missing codes", () => {
    expect(formatRegionDisplayName(null, "en")).toBeNull();
    expect(formatRegionDisplayName("", "en")).toBeNull();
    expect(formatRegionDisplayName("INVALID", "en")).toBeNull();
    expect(formatRegionDisplayName("ZZ", "en")).toBeNull();
  });
});

describe("formatSessionCountryLabel", () => {
  const t = vi.fn((key, opts) => {
    if (key === "settings.security.sessions.countryApproximate") {
      return `${opts.name} (approx.)`;
    }
    if (key === "settings.security.sessions.countryUnknown") {
      return "Unknown location";
    }
    return key;
  });

  it("adds approximate suffix once via i18n", () => {
    expect(formatSessionCountryLabel("CZ", "en", t)).toBe("Czechia (approx.)");
  });

  it("falls back when code missing", () => {
    expect(formatSessionCountryLabel(null, "en", t)).toBe("Unknown location");
  });
});