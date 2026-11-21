import { describe, expect, it } from 'vitest';
import { mergeConversationPages } from './conversationListPage';

describe('mergeConversationPages', () => {
  it('appends without duplicates', () => {
    const a = [{ id: '1' }, { id: '2' }];
    const b = [{ id: '2' }, { id: '3' }];
    const merged = mergeConversationPages(a, b);
    expect(merged.map((c) => c.id)).toEqual(['1', '2', '3']);
  });
});