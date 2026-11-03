/** Must match meyou-api `countPostChars` / `POST_*` (Unicode code points). */
export const POST_SHORT_TEXT_MAX = 200;
export const POST_FULL_TEXT_MAX = 5000;

export function countPostChars(text) {
  return Array.from(text ?? "").length;
}

export function clipPostChars(text, max) {
  const chars = Array.from(text ?? "");
  if (chars.length <= max) return text ?? "";
  return chars.slice(0, Math.max(0, max)).join("");
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
