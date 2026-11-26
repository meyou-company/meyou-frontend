import { describe, expect, it, vi } from 'vitest';
import { lazyPage } from './lazyPage';

describe('lazyPage', () => {
  it('returns a React lazy component', () => {
    const factory = vi.fn(() =>
      Promise.resolve({ default: function DummyPage() {} }),
    );
    const Lazy = lazyPage(factory, { moduleId: 'test-page' });
    expect(Lazy).toBeTruthy();
    expect(String(Lazy.$$typeof)).toContain('lazy');
  });

  it('exposes moduleId for chunk reload keying', () => {
    const Lazy = lazyPage(
      () => Promise.resolve({ default: function ChunkPage() {} }),
      { moduleId: 'page-chunk' },
    );
    expect(String(Lazy.$$typeof)).toContain('lazy');
    sessionStorage.removeItem('lunmeyo-chunk-reload:page-chunk');
  });
});