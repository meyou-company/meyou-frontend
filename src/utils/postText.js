/** Must match meyou-api `countPostChars` / `POST_*` (Unicode code points). */
export const POST_SHORT_TEXT_MAX = 200;
export const POST_FULL_TEXT_MAX = 5000;

export function countPostChars(text) {
  return Array.from(text ?? "").length;
}

/**
 * Clip to at most `max` Unicode code points without splitting a grapheme
 * (ZWJ families, flags, skin tones, emoji + VS16). May be shorter than `max`.
 */
export function clipPostChars(text, max) {
  const value = text ?? "";
  if (max <= 0) return "";
  if (countPostChars(value) <= max) return value;

  let out = "";
  let used = 0;
  for (const grapheme of graphemesOf(value)) {
    const size = countPostChars(grapheme);
    if (used + size > max) break;
    out += grapheme;
    used += size;
  }
  return out;
}

function graphemesOf(text) {
  const value = text ?? "";
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
      (part) => part.segment,
    );
  }
  return graphemesFallback(value);
}

function graphemesFallback(text) {
  const chars = Array.from(text ?? "");
  const clusters = [];
  const isRegionalIndicator = (char) => /^\p{Regional_Indicator}$/u.test(char);
  const isModifier = (char) =>
    char === "\uFE0F" ||
    char === "\uFE0E" ||
    /^\p{M}$/u.test(char) ||
    /^\p{Variation_Selector}$/u.test(char) ||
    /^\p{Emoji_Modifier}$/u.test(char);

  let i = 0;
  while (i < chars.length) {
    let cluster = chars[i];
    i += 1;
    if (
      isRegionalIndicator(cluster) &&
      i < chars.length &&
      isRegionalIndicator(chars[i])
    ) {
      cluster += chars[i];
      i += 1;
      clusters.push(cluster);
      continue;
    }
    while (i < chars.length) {
      const next = chars[i];
      if (next === "\u200D" && i + 1 < chars.length) {
        cluster += next + chars[i + 1];
        i += 2;
        while (i < chars.length && isModifier(chars[i])) {
          cluster += chars[i];
          i += 1;
        }
        continue;
      }
      if (isModifier(next)) {
        cluster += next;
        i += 1;
        continue;
      }
      break;
    }
    clusters.push(cluster);
  }
  return clusters;
}

export function isPostFullTextTooLong(text) {
  return countPostChars(text) > POST_FULL_TEXT_MAX;
}

export function formatPostCharCounter(count, max = POST_FULL_TEXT_MAX) {
  const safeCount = Math.max(0, Number(count) || 0);
  const safeMax = Math.max(0, Number(max) || 0);
  return `${formatGroupedNumber(safeCount)} / ${formatGroupedNumber(safeMax)}`;
}

function formatGroupedNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function shouldExpandPostText(text) {
  return countPostChars(text ?? "") > POST_SHORT_TEXT_MAX;
}

export function getPostTextPreview(text, max = POST_SHORT_TEXT_MAX) {
  return clipPostChars(text ?? "", max);
}
