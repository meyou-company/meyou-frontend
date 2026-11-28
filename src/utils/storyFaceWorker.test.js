import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it('supplies a worker canvas instead of relying on MediaPipe browser detection', async () => {
  const source = readFileSync(resolve('src/workers/storyFaceTracker.worker.js'), 'utf8')
    .replace(/^import .+from '@mediapipe\/tasks-vision';\s*/m, '')
    .replace(/import\.meta\.env\.BASE_URL \|\| '\/'/g, "'/'");
  const canvas = {};
  const createFromOptions = vi.fn(async (_vision, options) => {
    if (options.canvas !== canvas) throw Error('document is not defined');
    return { detectForVideo: () => ({ faceLandmarks: [[{ x: 0.5, y: 0.5 }]] }) };
  });
  const self = { location: { href: 'https://lunmeyo.com/assets/storyFaceTracker.worker.js' }, postMessage: vi.fn() };
  runInNewContext(source, {
    self, URL,
    OffscreenCanvas: function () { return canvas; },
    FaceLandmarker: { createFromOptions },
    FilesetResolver: { forVisionTasks: async () => ({}) },
  });
  await self.onmessage({ data: { type: 'init' } });
  await vi.waitFor(() => expect(self.postMessage).toHaveBeenCalledWith({ type: 'ready' }));
  const frame = { close: vi.fn() };
  await self.onmessage({ data: { type: 'frame', frame, timestamp: 100 } });
  expect(self.postMessage).toHaveBeenLastCalledWith({ type: 'result', landmarks: [{ x: 0.5, y: 0.5 }] });
  expect(frame.close).toHaveBeenCalledOnce();
});