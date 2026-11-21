const ISO2 = /^[A-Za-z]{2}$/;

/** BCP 47 for Intl from LUNMEYO ui locale (en, uk, ru, …). */
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
 * Localized approximate country label from ISO 3166-1 alpha-2 (CF edge).
 * @param {string | null | undefined} countryCode
 * @param {string} uiLocale — i18n.resolvedLanguage || i18n.language
 * @param {(key: string, opts?: object) => string} t
 */
export function formatSessionCountryLabel(countryCode, uiLocale, t) {
  const code = typeof countryCode === "string" ? countryCode.trim() : "";
  if (!code || !ISO2.test(code)) {
    return t("settings.security.sessions.countryUnknown");
  }
  const region = code.toUpperCase();
  try {
    const bcp = uiLocaleToBcp47(uiLocale);
    const display = new Intl.DisplayNames([bcp], { type: "region" });
    const name = display.of(region);
    if (!name || name.toUpperCase() === region) {
      return t("settings.security.sessions.countryUnknown");
    }
    return t("settings.security.sessions.countryApproximate", { name });
  } catch {
    return t("settings.security.sessions.countryUnknown");
  }
}