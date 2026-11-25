import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CHAT_IMAGE_MAX_OUTPUT_BYTES } from '../utils/chatImageOptimize';

vi.mock('./api', () => ({
  api: { get: vi.fn() },
  apiPath: (p) => p,
}));

vi.mock('../utils/chatImageOptimize', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    prepareChatImageForUpload: vi.fn(async (file) => file),
  };
});

import { api } from './api';
import { prepareChatImageForUpload } from '../utils/chatImageOptimize';
import { MESSAGE_IMAGE_MAX_BYTES, uploadMessageMedia } from './messageMediaUploadApi';

function makeFile(size, type, name = 'x.jpg') {
  return new File([new Uint8Array(size)], name, { type });
}

describe('messageMediaUploadApi image limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareChatImageForUpload.mockImplementation(async (file) => file);
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/x.jpg' }),
    }));
    api.get.mockResolvedValue({
      data: {
        uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload',
        api_key: 'k',
        timestamp: '1',
        signature: 's',
        folder: 'meyou/message-media',
        public_id: 'id',
      },
    });
  });

  it('exports backend-aligned 10MB image cap', () => {
    expect(MESSAGE_IMAGE_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(CHAT_IMAGE_MAX_OUTPUT_BYTES).toBe(MESSAGE_IMAGE_MAX_BYTES);
  });

  it('prepares image before presign', async () => {
    const big = makeFile(CHAT_IMAGE_MAX_OUTPUT_BYTES + 1, 'image/jpeg');
    const small = makeFile(1024, 'image/jpeg');
    prepareChatImageForUpload.mockResolvedValueOnce(small);

    const { url, file } = await uploadMessageMedia(big);
    expect(prepareChatImageForUpload).toHaveBeenCalledWith(
      big,
      expect.objectContaining({ onProgress: expect.any(Function) }),
    );
    expect(url).toContain('cloudinary');
    expect(file).toBe(small);
  });

  it('does not prepare video uploads', async () => {
    const video = makeFile(1024, 'video/mp4', 'clip.mp4');
    await uploadMessageMedia(video);
    expect(prepareChatImageForUpload).not.toHaveBeenCalled();
  });
});