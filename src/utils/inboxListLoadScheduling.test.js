import { describe, expect, it } from 'vitest';
import { shouldFetchInboxAfterSearchClear } from './inboxListLoadScheduling';

describe('inboxListLoadScheduling', () => {
  it('does not refetch inbox on initial empty search', () => {
    expect(shouldFetchInboxAfterSearchClear(false, '')).toBe(false);
  });

  it('refetches when user clears active server search', () => {
    expect(shouldFetchInboxAfterSearchClear(true, '')).toBe(true);
  });
});