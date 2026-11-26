import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoryFaceTracker } from './storyFaceTracker';
import en from '../i18n/locales/en.json';
import ru from '../i18n/locales/ru.json';

describe('camera Beauty recovery', () => {
  let workers;
  let callbacks;
  beforeEach(() => {
    vi.useFakeTimers();
    workers = [];
    callbacks = { onReady: vi.fn(), onResult: vi.fn(), onUnavailable: vi.fn() };
    vi.stubGlobal('Worker', class {
      constructor() { workers.push(this); }
      postMessage = vi.fn();
      terminate = vi.fn();
      emit(data) { this.onmessage({ data }); }
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('restarts after an initialization failure and accepts frames', () => {
    const tracker = createStoryFaceTracker(callbacks);
    workers[0].emit({ type: 'error', stage: 'init' });
    vi.advanceTimersByTime(250);
    expect(workers).toHaveLength(2);
    workers[1].emit({ type: 'ready' });
    const frame = { close: vi.fn() };
    tracker.postFrame(frame, 42);
    expect(workers[1].postMessage).toHaveBeenLastCalledWith({ type: 'frame', frame, timestamp: 42 }, [frame]);
    expect(callbacks.onReady).toHaveBeenLastCalledWith(true);
    expect(callbacks.onUnavailable).not.toHaveBeenCalled();
    tracker.terminate();
  });

  it('tolerates isolated bad frames without disabling Beauty', () => {
    const tracker = createStoryFaceTracker(callbacks);
    workers[0].emit({ type: 'ready' });
    workers[0].emit({ type: 'error', stage: 'frame' });
    expect(callbacks.onResult).toHaveBeenLastCalledWith(null);
    workers[0].emit({ type: 'result', landmarks: [1] });
    expect(callbacks.onResult).toHaveBeenLastCalledWith([1]);
    expect(workers[0].terminate).not.toHaveBeenCalled();
    tracker.terminate();
  });

  it('bounds retries and reports a persistent failure', () => {
    const tracker = createStoryFaceTracker(callbacks);
    vi.advanceTimersByTime(20250);
    workers[1].emit({ type: 'error', stage: 'init' });
    vi.advanceTimersByTime(60000);
    expect(workers).toHaveLength(2);
    expect(callbacks.onUnavailable).toHaveBeenCalledTimes(1);
    tracker.terminate();
  });

  it('cancels retry when closing the camera and ignores stale messages', () => {
    const tracker = createStoryFaceTracker(callbacks);
    workers[0].emit({ type: 'error', stage: 'init' });
    tracker.terminate();
    workers[0].emit({ type: 'ready' });
    vi.advanceTimersByTime(60000);
    expect(workers).toHaveLength(1);
    expect(callbacks.onReady).not.toHaveBeenCalledWith(true);
    expect(callbacks.onUnavailable).not.toHaveBeenCalled();
  });

  it('includes Russian translations for every camera message', () => {
    for (const key of Object.keys(en.storyCamera)) {
      expect(ru.storyCamera[key], key).toBeTruthy();
      expect(ru.storyCamera[key], key).not.toBe(en.storyCamera[key]);
    }
  });
});
