/**
 * Вставка емодзі в контрольований textarea на позиції курсора.
 * @returns {{ nextValue: string, selectionStart: number }}
 */
export function insertEmojiAtCursor(value, emoji, textarea) {
  const text = typeof value === "string" ? value : "";
  const start =
    textarea && typeof textarea.selectionStart === "number"
      ? textarea.selectionStart
      : text.length;
  const end =
    textarea && typeof textarea.selectionEnd === "number"
      ? textarea.selectionEnd
      : text.length;
  const nextValue = text.slice(0, start) + emoji + text.slice(end);
  return { nextValue, selectionStart: start + emoji.length };
}
