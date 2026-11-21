import { dedupeAsync } from "../utils/dedupeAsync";

export const REFRESH_PARALLEL_CODE = "REFRESH_PARALLEL";
export const SESSION_REFRESH_DEDUPE_KEY = "auth:session-refresh";
/** One initial attempt + bounded retries when another tab holds the rotation lock. */
export const MAX_REFRESH_PARALLEL_ATTEMPTS = 4;
const PARALLEL_RETRY_BASE_MS = 150;

export function isRefreshParallelConflict(err) {
  return (
    err?.response?.status === 409 &&
    err?.response?.data?.code === REFRESH_PARALLEL_CODE
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry only on REFRESH_PARALLEL (409). Other errors fail immediately (no logout here).
 */
export async function withRefreshParallelRetry(
  attemptFn,
  { maxAttempts = MAX_REFRESH_PARALLEL_ATTEMPTS } = {},
) {
  if (maxAttempts < 1) {
    throw new Error("maxAttempts must be >= 1");
  }
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await attemptFn();
    } catch (err) {
      lastErr = err;
      const canRetry =
        isRefreshParallelConflict(err) && attempt < maxAttempts - 1;
      if (!canRetry) {
        throw err;
      }
      await sleep(PARALLEL_RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * Single in-flight session refresh per tab (parallel calls share the same promise).
 */
export function dedupedSessionRefresh(refreshFn) {
  return dedupeAsync(SESSION_REFRESH_DEDUPE_KEY, refreshFn);
}