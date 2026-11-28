import { afterEach, describe, expect, it } from 'vitest';
import { AUTH_ACCESS_TOKEN_UPDATED_EVENT } from './api';
import {
  ensureLiveSocketAuthTokenListener,
  teardownLiveSocketAuthTokenListener,
} from './liveSocket';

const HANDLER_KEY = '__lunmeyoLiveSocketOnAccessTokenUpdated';

describe('liveSocket auth token listener (013)', () => {
  afterEach(() => {
    teardownLiveSocketAuthTokenListener();
  });

  it('replaces the prior handler instead of stacking listeners on re-ensure', () => {
    ensureLiveSocketAuthTokenListener();
    const first = window[HANDLER_KEY];
    ensureLiveSocketAuthTokenListener();
    const second = window[HANDLER_KEY];
    expect(first).toBeTypeOf('function');
    expect(second).toBe(first);
  });

  it('teardown removes the stored handler reference', () => {
    ensureLiveSocketAuthTokenListener();
    expect(window[HANDLER_KEY]).toBeTypeOf('function');
    teardownLiveSocketAuthTokenListener();
    expect(window[HANDLER_KEY]).toBeUndefined();
  });

  it('listens on AUTH_ACCESS_TOKEN_UPDATED_EVENT', () => {
    ensureLiveSocketAuthTokenListener();
    expect(window[HANDLER_KEY]).toBeTypeOf('function');
    const evt = new CustomEvent(AUTH_ACCESS_TOKEN_UPDATED_EVENT, {
      detail: { accessToken: 'sample' },
    });
    expect(() => window.dispatchEvent(evt)).not.toThrow();
  });
});