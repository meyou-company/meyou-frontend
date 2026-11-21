/** @typedef {{ id: string, [key: string]: unknown }} ConversationRow */

/**
 * Append a page of conversations without duplicates (by id).
 * @param {ConversationRow[]} prev
 * @param {ConversationRow[]} next
 * @returns {ConversationRow[]}
 */
export function mergeConversationPages(prev, next) {
  if (!next?.length) return prev ?? [];
  const base = Array.isArray(prev) ? prev : [];
  const seen = new Set(base.map((c) => String(c.id)));
  const merged = [...base];
  for (const row of next) {
    if (!row?.id) continue;
    const key = String(row.id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

/**
 * Upsert one conversation row into a list (e.g. WebSocket refresh).
 * @param {ConversationRow[]} prev
 * @param {ConversationRow} row
 * @returns {ConversationRow[]}
 */
export function upsertConversationRow(prev, row) {
  if (!row?.id) return prev ?? [];
  const base = Array.isArray(prev) ? prev : [];
  const key = String(row.id);
  const idx = base.findIndex((c) => String(c.id) === key);
  if (idx < 0) return [...base, row];
  const next = [...base];
  next[idx] = { ...next[idx], ...row };
  return next;
}