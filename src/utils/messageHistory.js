/** @param {string | number | undefined} id */
export function messageSortKey(m) {
  const t = Date.parse(m?.createdAt ?? '');
  const time = Number.isFinite(t) ? t : 0;
  const id = String(m?.id ?? '');
  return [time, id];
}

/** Merge ascending history chunks without duplicates (stable by id). */
export function mergeMessageHistory(existing, incoming) {
  const map = new Map();
  for (const m of [...existing, ...incoming]) {
    if (!m?.id) continue;
    const key = String(m.id);
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, ...m } : m);
  }
  return [...map.values()].sort((a, b) => {
    const [ta, ia] = messageSortKey(a);
    const [tb, ib] = messageSortKey(b);
    if (ta !== tb) return ta - tb;
    return ia.localeCompare(ib);
  });
}

/** True when scroll container is near the bottom (new messages should autoscroll). */
export function isNearBottom(el, thresholdPx = 120) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}