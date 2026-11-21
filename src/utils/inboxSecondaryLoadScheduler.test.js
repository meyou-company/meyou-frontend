import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInboxSecondaryLoadScheduler,
  shouldScheduleInboxSecondaryLoads,
} from './inboxSecondaryLoadScheduler';

describe('inboxSecondaryLoadScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid schedule calls into one run', () => {
    const onRun = vi.fn();
    const scheduler = createInboxSecondaryLoadScheduler(onRun, 400);
    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();
    expect(scheduler.hasPending()).toBe(true);
    vi.advanceTimersByTime(400);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('cancel clears pending run', () => {
    const onRun = vi.fn();
    const scheduler = createInboxSecondaryLoadScheduler(onRun, 400);
    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(500);
    expect(onRun).not.toHaveBeenCalled();
  });

  it('allows a later run after the first completed', () => {
    const onRun = vi.fn();
    const scheduler = createInboxSecondaryLoadScheduler(onRun, 400);
    scheduler.schedule();
    vi.advanceTimersByTime(400);
    scheduler.schedule();
    vi.advanceTimersByTime(400);
    expect(onRun).toHaveBeenCalledTimes(2);
  });
});

describe('shouldScheduleInboxSecondaryLoads', () => {
  it('always schedules on foreground list settle (incl. after errors)', () => {
    expect(
      shouldScheduleInboxSecondaryLoads({
        background: false,
        primarySettled: true,
      }),
    ).toEqual({ schedule: true, markSettled: true });
  });

  it('schedules first background settle when cache-only path', () => {
    expect(
      shouldScheduleInboxSecondaryLoads({
        background: true,
        primarySettled: false,
      }),
    ).toEqual({ schedule: true, markSettled: true });
  });

  it('skips repeat schedule on later background-only refreshes', () => {
    expect(
      shouldScheduleInboxSecondaryLoads({
        background: true,
        primarySettled: true,
      }),
    ).toEqual({ schedule: false, markSettled: false });
  });
});