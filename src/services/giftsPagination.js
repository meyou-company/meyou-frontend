import { giftsApi, normalizeGiftListResponse } from './giftsApi';

export const GIFTS_PAGE_SIZE = 30;
/** Safety cap for pending-only paging (not full gift history). */
export const GIFTS_PENDING_MAX_PAGES = 20;

export function mergeGiftListItems(existing, incoming) {
  const next = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(next.map((item) => item?.id).filter(Boolean));
  for (const item of incoming ?? []) {
    const id = item?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(item);
  }
  return next;
}

/** Load every PENDING received gift via bounded pending-only pages. */
export async function fetchPendingReceivedGifts({
  take = GIFTS_PAGE_SIZE,
  maxPages = GIFTS_PENDING_MAX_PAGES,
} = {}) {
  const items = [];
  let cursor;
  let pages = 0;
  do {
    const page = await giftsApi.getReceivedPending({ cursor, take });
    items.push(...(page?.items ?? []));
    cursor = page?.hasMore ? page.nextCursor : undefined;
    pages += 1;
  } while (cursor && pages < maxPages);
  return mergeGiftListItems([], items);
}

export { normalizeGiftListResponse };