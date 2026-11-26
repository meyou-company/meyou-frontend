import { giftsApi } from './giftsApi';

const DEFAULT_PAGE_SIZE = 100;

/** Load full gift history via cursor pages (backward compatible API). */
export async function fetchAllReceivedGifts({ take = DEFAULT_PAGE_SIZE } = {}) {
  const items = [];
  let cursor;
  let guard = 0;
  do {
    const page = await giftsApi.getReceived({ cursor, take });
    const batch = Array.isArray(page?.items) ? page.items : [];
    items.push(...batch);
    cursor = page?.hasMore ? page.nextCursor : undefined;
    guard += 1;
  } while (cursor && guard < 500);
  return items;
}

export async function fetchAllSentGifts({ take = DEFAULT_PAGE_SIZE } = {}) {
  const items = [];
  let cursor;
  let guard = 0;
  do {
    const page = await giftsApi.getSent({ cursor, take });
    const batch = Array.isArray(page?.items) ? page.items : [];
    items.push(...batch);
    cursor = page?.hasMore ? page.nextCursor : undefined;
    guard += 1;
  } while (cursor && guard < 500);
  return items;
}