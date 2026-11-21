import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatAttachmentDelivery } from './useChatAttachmentDelivery.js';

const loadMock = vi.hoisted(() => vi.fn());
const subscribeMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/chatMediaDeliveryCache.js', () => ({
  loadChatAttachmentDelivery: (...args) => loadMock(...args),
  subscribeChatDelivery: (...args) => subscribeMock(...args),
}));

describe('useChatAttachmentDelivery', () => {
  beforeEach(() => {
    loadMock.mockReset();
    subscribeMock.mockReset();
    subscribeMock.mockImplementation((_c, _a, setEntry) => {
      setEntry({
        status: 'ready',
        deliveryUrl: 'https://cdn/protected.jpg',
        cdnEnforcesExpiry: true,
      });
      return () => {};
    });
    loadMock.mockResolvedValue({ status: 'ready', deliveryUrl: 'https://cdn/protected.jpg' });
  });

  it('uses legacy url when protected mode is disabled (feature flag off path)', () => {
    const { result } = renderHook(() =>
      useChatAttachmentDelivery({
        conversationId: 'conv',
        attachmentId: 'att',
        legacyUrl: 'https://legacy.public/url.jpg',
        enabled: false,
        lazy: false,
      }),
    );

    expect(result.current.mode).toBe('legacy');
    expect(result.current.url).toBe('https://legacy.public/url.jpg');
    expect(result.current.useProtectedUrl).toBe(false);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it('onMediaError triggers at most one forced refresh', async () => {
    const { result } = renderHook(() =>
      useChatAttachmentDelivery({
        conversationId: 'conv',
        attachmentId: 'att',
        legacyUrl: 'https://legacy',
        enabled: true,
        lazy: false,
      }),
    );

    await waitFor(() => expect(result.current.useProtectedUrl).toBe(true));

    act(() => {
      result.current.onMediaError();
      result.current.onMediaError();
      result.current.onMediaError();
    });

    const forced = loadMock.mock.calls.filter((c) => c[2]?.force === true);
    expect(forced.length).toBe(1);
  });
});