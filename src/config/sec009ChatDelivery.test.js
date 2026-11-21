import { describe, expect, it, vi, afterEach } from 'vitest';

describe('isSec009ChatPrivateDeliveryEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns false when env unset (production default)', async () => {
    vi.stubEnv('VITE_SEC009_CHAT_PRIVATE_DELIVERY_ENABLED', '');
    const { isSec009ChatPrivateDeliveryEnabled } = await import('./sec009ChatDelivery.js');
    expect(isSec009ChatPrivateDeliveryEnabled()).toBe(false);
  });

  it('returns true only when explicitly enabled', async () => {
    vi.stubEnv('VITE_SEC009_CHAT_PRIVATE_DELIVERY_ENABLED', 'true');
    const { isSec009ChatPrivateDeliveryEnabled } = await import('./sec009ChatDelivery.js');
    expect(isSec009ChatPrivateDeliveryEnabled()).toBe(true);
  });
});