import { describe, expect, it } from 'vitest';

describe('preloadCallOverlayChunks', () => {
  it('dedupes parallel preload requests', async () => {
    const { preloadCallOverlayChunks } = await import('./callOverlayChunks.jsx');
    const first = preloadCallOverlayChunks();
    const second = preloadCallOverlayChunks();
    expect(first).toBe(second);
    await first;
  });

  it('resolves overlay and callRoomSession imports without mounting UI', async () => {
    const { preloadCallOverlayChunks } = await import('./callOverlayChunks.jsx');
    const result = await preloadCallOverlayChunks();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });
});