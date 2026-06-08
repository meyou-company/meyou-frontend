/** Share one in-flight promise per key to avoid duplicate parallel API calls. */
const inFlight = new Map();

export function dedupeAsync(key, fn) {
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
