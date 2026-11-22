import { describe, expect, it } from 'vitest';
import { buildPostShareUrl } from './postShareUrl';

describe('buildPostShareUrl', () => {
  it('uses /post/:id canonical path', () => {
    expect(buildPostShareUrl('abc-123')).toMatch(/\/post\/abc-123$/);
    expect(buildPostShareUrl('abc-123')).not.toContain('/posts/');
  });
});