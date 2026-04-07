/**
 * Текст помилки з axios (response.data.message).
 * Бекенд може повертати string | string[] | object.
 * Не використовувати message[0], якщо message — рядок: це лише перший символ.
 */
export function getApiErrorMessage(error) {
  if (!error) return "";
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) return data.trim();

  const m = data?.message;

  if (Array.isArray(m)) {
    const firstStr = m.find((x) => typeof x === "string" && x.trim());
    if (firstStr) return firstStr.trim();
    return m.length ? String(m[0]) : "";
  }
  if (typeof m === "string") return m.trim();
  if (m != null && typeof m === "object" && typeof m.message === "string") {
    return m.message.trim();
  }

  const fallback = error.message;
  return typeof fallback === "string" && fallback.trim() ? fallback.trim() : "";
}
