import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  CHAT_IMAGE_MAX_INPUT_BYTES,
  CHAT_IMAGE_MAX_OUTPUT_BYTES,
  ChatImageUploadError,
  isAnimatedGifBuffer,
  isChatImageMime,
  prepareChatImageForUpload,
  shouldPrepareChatImage,
} from './chatImageOptimize';

function makeFile(size, type = 'image/jpeg', name = 'photo.jpg') {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe('chatImageOptimize helpers', () => {
  it('detects animated GIF via multiple graphic control extensions', () => {
    const buf = new Uint8Array([0x21, 0xf9, 0x00, 0x21, 0xf9, 0x00]);
    expect(isAnimatedGifBuffer(buf.buffer)).toBe(true);
    expect(isAnimatedGifBuffer(new Uint8Array([0x21, 0xf9]).buffer)).toBe(false);
  });

  it('shouldPrepareChatImage when over output cap or HEIC', () => {
    const big = makeFile(CHAT_IMAGE_MAX_OUTPUT_BYTES + 1);
    expect(shouldPrepareChatImage(big)).toBe(true);
    const heic = makeFile(1000, 'image/heic', 'img.heic');
    expect(shouldPrepareChatImage(heic)).toBe(true);
    const small = makeFile(1024);
    expect(shouldPrepareChatImage(small)).toBe(false);
  });

  it('rejects non-images and oversize input', async () => {
    await expect(
      prepareChatImageForUpload(makeFile(100, 'video/mp4', 'v.mp4')),
    ).rejects.toMatchObject({ code: 'CHAT_IMAGE_INVALID' });

    await expect(
      prepareChatImageForUpload(
        makeFile(CHAT_IMAGE_MAX_INPUT_BYTES + 1, 'image/jpeg', 'big.jpg'),
      ),
    ).rejects.toMatchObject({ code: 'CHAT_IMAGE_TOO_LARGE_INPUT' });
  });

  it('passes through small JPEG without decode', async () => {
    const file = makeFile(2048, 'image/jpeg', 'ok.jpg');
    const out = await prepareChatImageForUpload(file);
    expect(out).toBe(file);
  });

  it('rejects animated GIF over output limit', async () => {
    const file = {
      size: CHAT_IMAGE_MAX_OUTPUT_BYTES + 1,
      name: 'anim.gif',
      type: 'image/gif',
      arrayBuffer: async () => {
        const u = new Uint8Array([0x21, 0xf9, 0x00, 0x21, 0xf9, 0x00]);
        return u.buffer;
      },
    };
    await expect(prepareChatImageForUpload(file)).rejects.toMatchObject({
      code: 'CHAT_IMAGE_GIF_TOO_LARGE',
    });
  });
});

describe('prepareChatImageForUpload with mocked decode', () => {
  let originalBitmap;

  beforeEach(() => {
    originalBitmap = globalThis.createImageBitmap;
    globalThis.createImageBitmap = vi.fn(async () => ({
      width: 4000,
      height: 3000,
      close: vi.fn(),
    }));
    HTMLCanvasElement.prototype.toBlob = function (cb, type, _quality) {
      const pixels = type === 'image/png' ? 3 * 1024 * 1024 : 4 * 1024 * 1024;
      cb(new Blob([new Uint8Array(pixels)], { type }));
    };
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        drawImage: vi.fn(),
        getImageData: () => ({
          data: new Uint8ClampedArray(4 * 96 * 96).fill(255),
        }),
      };
    };
  });

  afterEach(() => {
    globalThis.createImageBitmap = originalBitmap;
  });

  it('optimizes large image under mocked canvas encode', async () => {
    const file = makeFile(CHAT_IMAGE_MAX_OUTPUT_BYTES + 50_000);
    const out = await prepareChatImageForUpload(file);
    expect(isChatImageMime(out.type)).toBe(true);
    expect(out.size).toBeLessThanOrEqual(CHAT_IMAGE_MAX_OUTPUT_BYTES);
    expect(out.size).toBeGreaterThan(0);
    expect(globalThis.createImageBitmap).toHaveBeenCalled();
  });

  it('maps decode failure to CHAT_IMAGE_OPTIMIZE_FAILED', async () => {
    globalThis.createImageBitmap = vi.fn(async () => {
      throw new Error('decode');
    });
    const file = makeFile(CHAT_IMAGE_MAX_OUTPUT_BYTES + 1);
    await expect(prepareChatImageForUpload(file)).rejects.toBeInstanceOf(
      ChatImageUploadError,
    );
    await expect(prepareChatImageForUpload(file)).rejects.toMatchObject({
      code: 'CHAT_IMAGE_OPTIMIZE_FAILED',
    });
  });
});