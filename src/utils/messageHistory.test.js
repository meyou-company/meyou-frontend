import { describe, expect, it } from 'vitest';
import { mergeMessageHistory, messageSortKey } from './messageHistory.js';

describe('messageHistory', () => {
  it('sorts by createdAt then id when timestamps match', () => {
    const a = { id: 'b', createdAt: '2024-01-01T00:00:00.000Z' };
    const b = { id: 'a', createdAt: '2024-01-01T00:00:00.000Z' };
    expect(messageSortKey(a)[0]).toBe(messageSortKey(b)[0]);
    const merged = mergeMessageHistory([], [b, a]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('deduplicates when prepending older pages', () => {
    const shared = {
      id: '1',
      createdAt: '2024-01-02T00:00:00.000Z',
      text: 'new',
    };
    const older = {
      id: '0',
      createdAt: '2024-01-01T00:00:00.000Z',
      text: 'old',
    };
    const next = mergeMessageHistory([shared], [older, { ...shared, text: 'dup' }]);
    expect(next).toHaveLength(2);
    expect(next[1].text).toBe('dup');
  });

  it('handles 2000+ ids without duplicate keys', () => {
    const chunk = Array.from({ length: 50 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      createdAt: new Date(Date.UTC(2020, 0, 1, 0, i)).toISOString(),
    }));
    let all = [];
    for (let pass = 0; pass < 40; pass += 1) {
      all = mergeMessageHistory(all, chunk.map((m, idx) => ({ ...m, pass: pass * 50 + idx })));
    }
    expect(all).toHaveLength(50);
  });
});