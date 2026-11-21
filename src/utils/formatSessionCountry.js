const ISO2 = /^[A-Za-z]{2}$/;

/**
 * Mirrors meyou-api `format-region-display.ts` (Intl.DisplayNames, type region).
 * Keep both in sync when changing locale → BCP 47 mapping.
 */
export function uiLocaleToBcp47(uiLocale) {
  const raw = (uiLocale || "en").trim();
  const base = raw.split("-")[0].toLowerCase();
  const map = {
    uk: "uk",
    en: "en",
    ru: "ru",
    tr: "tr",
    fr: "fr",
    es: "es",
    cs: "cs",
    ar: "ar",
  };
  return map[base] || base || "en";
}

/**
 * Localized region name only (no “approximate” suffix).
 * @returns {string | null} null when code missing, invalid, or Intl cannot resolve
 */
export function formatRegionDisplayName(countryCode, uiLocale) {
  const code = typeof countryCode === "string" ? countryCode.trim() : "";
  if (!code || !ISO2.test(code)) {
    return null;
  }
  const region = code.toUpperCase();
  try {
    const bcp = uiLocaleToBcp47(uiLocale);
    const display = new Intl.DisplayNames([bcp], { type: "region" });
    const name = display.of(region);
    if (
      !name ||
      name.toUpperCase() === region ||
      /^unknown\b/i.test(name)
    ) {
      return null;
    }
    return name;
  } catch {
    return null;
  }
}

/**
 * Sessions list: localized name + single “(approx.)” via i18n.
 * @param {string | null | undefined} countryCode
 * @param {string} uiLocale — i18n.resolvedLanguage || i18n.language
 * @param {(key: string, opts?: object) => string} t
 */
export function formatSessionCountryLabel(countryCode, uiLocale, t) {
  const name = formatRegionDisplayName(countryCode, uiLocale);
  if (!name) {
    return t("settings.security.sessions.countryUnknown");
  }
  return t("settings.security.sessions.countryApproximate", { name });
}