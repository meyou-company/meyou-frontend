import { describe, expect, it } from 'vitest';
import {
  MessengerThreadCache,
  mergeInboxHeadRefresh,
  mergeThreadWithLatestPage,
  reconcileThreadWithLatestPage,
  trimThreadMessages,
} from './messengerCache';

describe('messengerCache', () => {
  it('evicts LRU threads beyond max', () => {
    const cache = new MessengerThreadCache(2);
    cache.set('a', { messages: [{ id: '1' }] });
    cache.set('b', { messages: [{ id: '2' }] });
    cache.get('a');
    cache.set('c', { messages: [{ id: '3' }] });
    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toBeTruthy();
    expect(cache.get('c')).toBeTruthy();
  });

  it('trims message count per thread', () => {
    const msgs = Array.from({ length: 250 }, (_, i) => ({
      id: String(i),
      createdAt: new Date(Date.UTC(2020, 0, 1, 0, 0, i)).toISOString(),
    }));
    expect(trimThreadMessages(msgs).length).toBe(200);
  });

  it('merges inbox head refresh keeping tail pages', () => {
    const prev = [
      { id: '1', updatedAt: '2025-01-02' },
      { id: '2', updatedAt: '2025-01-01' },
    ];
    const fresh = [{ id: '1', updatedAt: '2025-01-03' }];
    const merged = mergeInboxHeadRefresh(prev, fresh);
    expect(merged.map((c) => c.id)).toEqual(['1', '2']);
    expect(merged[0].updatedAt).toBe('2025-01-03');
  });

  it('reconcile drops tail rows omitted by server (delete-for-me)', () => {
    const cached = [
      { id: '1', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: '2', createdAt: '2024-01-02T00:00:00.000Z' },
      { id: '3', createdAt: '2024-01-03T00:00:00.000Z' },
    ];
    const latest = [
      { id: '2', createdAt: '2024-01-02T00:00:00.000Z' },
      { id: '3', createdAt: '2024-01-03T00:00:00.000Z', text: 'ok' },
    ];
    expect(reconcileThreadWithLatestPage(cached, latest).map((m) => m.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
    const tailOnly = [
      { id: '2', createdAt: '2024-01-02T00:00:00.000Z' },
      { id: '3', createdAt: '2024-01-03T00:00:00.000Z' },
    ];
    expect(
      reconcileThreadWithLatestPage(tailOnly, [
        { id: '2', createdAt: '2024-01-02T00:00:00.000Z' },
      ]).map((m) => m.id),
    ).toEqual(['2']);
  });

  it('reconcile empty latest clears visible history', () => {
    const cached = [{ id: '1', createdAt: '2024-01-01T00:00:00.000Z' }];
    expect(reconcileThreadWithLatestPage(cached, [])).toEqual([]);
  });

  it('merges thread sync without duplicates', () => {
    const cached = [
      { id: '1', createdAt: '2024-01-01T00:00:00.000Z', text: 'a' },
      { id: '2', createdAt: '2024-01-02T00:00:00.000Z', text: 'b' },
    ];
    const latest = [
      { id: '2', createdAt: '2024-01-02T00:00:00.000Z', text: 'b-edited' },
      { id: '3', createdAt: '2024-01-03T00:00:00.000Z', text: 'c' },
    ];
    const out = mergeThreadWithLatestPage(cached, latest);
    expect(out).toHaveLength(3);
    expect(out.find((m) => m.id === '2')?.text).toBe('b-edited');
  });
});