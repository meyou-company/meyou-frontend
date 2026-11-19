import { parseLunmeyoStickerId, readLunmeyoStickerId } from "../constants/lunmeyoIds.js";

export const LUNMEYO_TOKEN_RE = /::lunmeyo:([a-z0-9-]+)::/g;

export function toLunmeyoToken(id) {
  const safe = parseLunmeyoStickerId(id);
  return safe ? `::lunmeyo:${safe}::` : "";
}

export function splitLunmeyoText(text) {
  const raw = String(text ?? "");
  if (!raw) return [];
  const parts = [];
  const re = new RegExp(LUNMEYO_TOKEN_RE.source, "g");
  let last = 0;
  let match;
  while ((match = re.exec(raw))) {
    if (match.index > last) {
      parts.push({ type: "text", value: raw.slice(last, match.index) });
    }
    const id = parseLunmeyoStickerId(match[1]);
    if (id) parts.push({ type: "sticker", id });
    else parts.push({ type: "text", value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < raw.length) {
    parts.push({ type: "text", value: raw.slice(last) });
  }
  return parts;
}

export function isLunmeyoTokenOnly(text) {
  const parts = splitLunmeyoText(text);
  return parts.length === 1 && parts[0].type === "sticker";
}

export function isStandaloneLunmeyoMessage(message) {
  const id = readLunmeyoStickerId(message?.metadata, message?.text);
  if (!id) return false;
  if (Array.isArray(message?.attachments) && message.attachments.length) return false;
  const text = String(message?.text || "").trim();
  return text === "" || isLunmeyoTokenOnly(text);
}

export function replaceLunmeyoTokensForPreview(text, fallback = "") {
  return String(text || "")
    .replace(LUNMEYO_TOKEN_RE, fallback)
    .replace(/\s+/g, " ")
    .trim();
}

export function clipLunmeyoSafe(text) {
  const value = String(text ?? "");
  const lastStart = value.lastIndexOf("::lunmeyo:");
  if (lastStart === -1) return value;
  const after = value.slice(lastStart);
  if (/^::lunmeyo:[a-z0-9-]+::$/.test(after)) return value;
  return value.slice(0, lastStart).trimEnd();
}
