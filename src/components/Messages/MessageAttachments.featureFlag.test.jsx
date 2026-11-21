import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const ChatAttachmentMediaMock = vi.hoisted(() => vi.fn(() => null));

vi.mock('../../config/sec009ChatDelivery.js', () => ({
  isSec009ChatPrivateDeliveryEnabled: () => false,
}));

vi.mock('./ChatAttachmentMedia.jsx', () => ({
  default: ChatAttachmentMediaMock,
}));

import MessageAttachments from './MessageAttachments.jsx';

describe('MessageAttachments feature flag', () => {
  it('does not enable protected delivery when VITE flag is off', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(
        createElement(MessageAttachments, {
          attachments: [{ id: 'att-1', url: 'https://legacy.example/img.jpg', mimeType: 'image/jpeg' }],
          conversationId: 'conv-1',
        }),
      );
    });

    expect(ChatAttachmentMediaMock).toHaveBeenCalled();
    const props = ChatAttachmentMediaMock.mock.calls[0][0];
    expect(props.protectedDeliveryEnabled).toBe(false);
    expect(props.conversationId).toBe('conv-1');

    root.unmount();
    div.remove();
  });
});