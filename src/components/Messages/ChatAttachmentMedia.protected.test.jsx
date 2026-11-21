import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

const useDeliveryMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useChatAttachmentDelivery.js', () => ({
  useChatAttachmentDelivery: (...args) => useDeliveryMock(...args),
}));

import ChatAttachmentMedia from './ChatAttachmentMedia.jsx';

describe('ChatAttachmentMedia protected errors', () => {
  it('shows unavailable state on 503 without using legacy public url', async () => {
    useDeliveryMock.mockReturnValue({
      useProtectedUrl: true,
      url: null,
      loading: false,
      error: { status: 503, nonRetryable: false },
      retry: vi.fn(),
      observe: () => undefined,
      onMediaError: undefined,
    });

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(
        createElement(ChatAttachmentMedia, {
          rawAtt: { id: 'att', url: 'https://public.leak/me.jpg', mimeType: 'image/jpeg' },
          messageType: 'IMAGE',
          conversationId: 'conv',
          isMine: false,
          protectedDeliveryEnabled: true,
          onOpenViewer: vi.fn(),
        }),
      );
    });

    expect(div.textContent).toContain('messenger.attachmentDeliveryUnavailable');
    expect(div.innerHTML).not.toContain('https://public.leak/me.jpg');

    root.unmount();
    div.remove();
  });
});