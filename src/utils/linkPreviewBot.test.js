import { describe, expect, it } from 'vitest';
import {
  isSocialCrawlerUserAgent,
  isSocialPreviewPath,
} from './linkPreviewBot';

describe('linkPreviewBot', () => {
  it('matches crawler user agents', () => {
    expect(isSocialCrawlerUserAgent('facebookexternalhit/1.1')).toBe(true);
    expect(isSocialCrawlerUserAgent('Mozilla/5.0 Chrome')).toBe(false);
  });

  it('matches share preview paths', () => {
    expect(isSocialPreviewPath('/')).toBe(true);
    expect(isSocialPreviewPath('/profile/alice')).toBe(true);
    expect(isSocialPreviewPath('/post/uuid')).toBe(true);
    expect(isSocialPreviewPath('/posts/uuid')).toBe(true);
    expect(isSocialPreviewPath('/messages')).toBe(false);
    expect(isSocialPreviewPath('/profile/alice/photos')).toBe(false);
  });
});