import { describe, expect, it } from 'vitest';
import { buildSafeDefaultOgHtml } from './linkPreviewFallbackHtml';
import { cacheControlForPreviewPath } from './linkPreviewCache';

describe('buildSafeDefaultOgHtml', () => {
  it('includes default LUNMEYO og image and no private placeholders', () => {
    const html = buildSafeDefaultOgHtml();
    expect(html).toContain('og:image');
    expect(html).toContain('/og/lunmeyo-og.png');
    expect(html).toContain('LUNMEYO');
    expect(html).not.toMatch(/@username|__cld_token__|session/i);
  });
});

describe('cacheControlForPreviewPath', () => {
  it('uses short cache for profile and post paths', () => {
    expect(cacheControlForPreviewPath('/profile/alice')).toContain('max-age=60');
    expect(cacheControlForPreviewPath('/post/uuid')).toContain('must-revalidate');
  });

  it('uses home cache for root and API fallback', () => {
    expect(cacheControlForPreviewPath('/')).toContain('max-age=300');
    expect(cacheControlForPreviewPath('/profile/x', { fallback: true })).toContain(
      'max-age=300',
    );
  });
});