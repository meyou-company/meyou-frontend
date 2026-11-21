import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  apiPath: (p) => `/api${p}`,
}));

import { api } from './api';
import { conversationsApi } from './conversationsApi';

describe('conversationsApi.markConversationRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.patch.mockResolvedValue({ data: { unreadCount: 0, changed: true } });
  });

  it('sends readUpToMessageId watermark in PATCH body', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const msgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await conversationsApi.markConversationRead(id, { readUpToMessageId: msgId });
    expect(api.patch).toHaveBeenCalledWith(
      `/api/conversations/${id}/read`,
      { readUpToMessageId: msgId },
    );
  });

  it('omits body when watermark absent', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await conversationsApi.markConversationRead(id);
    expect(api.patch).toHaveBeenCalledWith(`/api/conversations/${id}/read`, undefined);
  });
});