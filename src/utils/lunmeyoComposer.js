import { parseLunmeyoStickerId } from "../constants/lunmeyoIds.js";
import { splitLunmeyoText, toLunmeyoToken } from "./lunmeyoToken.js";

export function parseLunmeyoComposer(raw) {
  const parts = splitLunmeyoText(raw);
  const stickerIds = parts.filter((part) => part.type === "sticker").map((part) => part.id);
  let displayText = parts
    .filter((part) => part.type === "text")
    .map((part) => part.value)
    .join("");
  if (stickerIds.length) {
    displayText = displayText.replace(/ $/, "");
  }
  return { displayText, stickerIds };
}

export function serializeLunmeyoComposer(displayText, stickerIds = []) {
  const tokens = stickerIds.map((id) => toLunmeyoToken(id)).filter(Boolean);
  const text = String(displayText ?? "");
  if (!tokens.length) return text;
  if (!text) return tokens.join("");
  const sep = /[\s\n]$/.test(text) ? "" : " ";
  return `${text}${sep}${tokens.join(" ")}`;
}

export function replaceLunmeyoComposerDisplay(currentRaw, nextDisplayRaw) {
  const current = parseLunmeyoComposer(currentRaw);
  const next = parseLunmeyoComposer(nextDisplayRaw);
  const stickerIds = next.stickerIds.length
    ? [...current.stickerIds, ...next.stickerIds]
    : current.stickerIds;
  return serializeLunmeyoComposer(next.displayText, stickerIds);
}

export function addLunmeyoComposerSticker(currentRaw, id) {
  const safe = parseLunmeyoStickerId(id);
  if (!safe) return String(currentRaw ?? "");
  const { displayText, stickerIds } = parseLunmeyoComposer(currentRaw);
  return serializeLunmeyoComposer(displayText, [...stickerIds, safe]);
}

export function removeLunmeyoComposerSticker(currentRaw, index) {
  const { displayText, stickerIds } = parseLunmeyoComposer(currentRaw);
  if (index < 0 || index >= stickerIds.length) return String(currentRaw ?? "");
  return serializeLunmeyoComposer(
    displayText,
    stickerIds.filter((_, itemIndex) => itemIndex !== index),
  );
}

export function clampLunmeyoComposer(raw, maxLength) {
  if (!maxLength) return String(raw ?? "");
  const value = String(raw ?? "");
  if (value.length <= maxLength) return value;
  const { displayText, stickerIds } = parseLunmeyoComposer(value);
  let text = displayText;
  let ids = [...stickerIds];
  let next = serializeLunmeyoComposer(text, ids);
  while (text.length && next.length > maxLength) {
    text = text.slice(0, -1);
    next = serializeLunmeyoComposer(text, ids);
  }
  while (ids.length && next.length > maxLength) {
    ids = ids.slice(0, -1);
    next = serializeLunmeyoComposer(text, ids);
  }
  return next;
}
