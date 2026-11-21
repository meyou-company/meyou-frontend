/**
 * Coalesces deferred inbox secondary fetches (hidden + unread) into one timer.
 */
export function createInboxSecondaryLoadScheduler(onRun, delayMs) {
  let timerId = null;

  return {
    schedule() {
      if (timerId != null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        onRun();
      }, delayMs);
    },
    cancel() {
      if (timerId != null) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
    hasPending() {
      return timerId != null;
    },
  };
}

/**
 * @param {{ background: boolean, primarySettled: boolean }} input
 * @returns {{ schedule: boolean, markSettled: boolean }}
 */
export function shouldScheduleInboxSecondaryLoads({ background, primarySettled }) {
  if (!background) {
    return { schedule: true, markSettled: true };
  }
  if (!primarySettled) {
    return { schedule: true, markSettled: true };
  }
  return { schedule: false, markSettled: false };
}