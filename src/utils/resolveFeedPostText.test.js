import { describe, expect, it } from 'vitest';
import { resolveFeedPostText } from './resolveFeedPostText';

describe('resolveFeedPostText', () => {
  it('prefers mapped text field', () => {
    expect(resolveFeedPostText({ text: 'hello', fullText: 'other' })).toBe('hello');
  });

  it('falls back to API fullText / shortText', () => {
    expect(resolveFeedPostText({ fullText: 'full' })).toBe('full');
    expect(resolveFeedPostText({ shortText: 'short' })).toBe('short');
  });
});