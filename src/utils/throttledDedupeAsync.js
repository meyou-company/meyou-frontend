import { dedupeAsync } from './dedupeAsync';

/** Minimum interval between successful fetches (ms). */
const lastSuccessAt = new Map();

/**
 * Dedupe in-flight + skip if last success was within minIntervalMs.
 * Pass force=true to bypass throttle (still dedupes parallel calls).
 */
export function throttledDedupeAsync(key, fn, minIntervalMs = 15000, { force = false } = {}) {
  const now = Date.now();
  const lastAt = lastSuccessAt.get(key) ?? 0;

  if (!force && now - lastAt < minIntervalMs) {
    return Promise.resolve(undefined);
  }

  return dedupeAsync(key, async () => {
    const result = await fn();
    lastSuccessAt.set(key, Date.now());
    return result;
  });
}

export function resetThrottle(key) {
  lastSuccessAt.delete(key);
}

export function resetAllThrottles() {
  lastSuccessAt.clear();
}
