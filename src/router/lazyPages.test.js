import { describe, expect, it } from 'vitest';
import * as LazyPages from './lazyPages';

const LAZY_PAGE_KEYS = [
  'HomePage',
  'MessagesPage',
  'LivePage',
  'LoginPage',
  'AdminLayout',
  'Post',
];

describe('lazyPages route registry', () => {
  it('exports lazy components for main routes', () => {
    for (const key of LAZY_PAGE_KEYS) {
      const Comp = LazyPages[key];
      expect(Comp).toBeTruthy();
      expect(Comp.$$typeof?.toString()).toContain('react.lazy');
    }
  });
});