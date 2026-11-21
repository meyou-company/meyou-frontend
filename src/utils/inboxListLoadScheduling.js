/** Avoid duplicate GET /conversations when mount already loaded empty search. */
export function shouldFetchInboxAfterSearchClear(serverSearchActive, trimmedQuery) {
  return Boolean(serverSearchActive) && trimmedQuery.length === 0;
}