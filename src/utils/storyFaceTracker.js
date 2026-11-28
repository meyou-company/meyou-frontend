export function createStoryFaceTracker({ onReady, onResult, onUnavailable }) {
  let worker;
  let disposed = false;
  let retries = 0;
  let frameErrors = 0;
  let timeout;
  let retryTimer;
  const fail = error => {
    if (disposed) return;
    clearTimeout(timeout);
    worker?.terminate();
    worker = null;
    onReady(false);
    if (retries++ < 1) retryTimer = setTimeout(start, 250);
    else {
      console.error('[story-camera] Beauty unavailable after retry', error);
      onUnavailable(error);
    }
  };
  function start() {
    if (disposed) return;
    frameErrors = 0;
    try {
      const current = new Worker(
        new URL('../workers/storyFaceTracker.worker.js', import.meta.url),
        { type: 'module' },
      );
      worker = current;
      timeout = setTimeout(() => fail(new Error('Beauty initialization timed out')), 20000);
      current.onmessage = ({ data }) => {
        if (disposed || current !== worker) return;
        if (data.type === 'ready') { clearTimeout(timeout); onReady(true); }
        if (data.type === 'result') { frameErrors = 0; onResult(data.landmarks); }
        if (data.type === 'error') {
          // A bad camera frame must not permanently disable the tracker.
          if (data.stage === 'frame') {
            onResult(null);
            if (++frameErrors < 3) return;
          }
          fail(data);
        }
      };
      current.onerror = error => { if (current === worker) fail(error); };
      current.postMessage({ type: 'init' });
    } catch (error) { fail(error); }
  }
  start();
  return {
    postFrame(frame, timestamp) {
      if (!worker || disposed) { frame.close(); onResult(null); return; }
      try { worker.postMessage({ type: 'frame', frame, timestamp }, [frame]); }
      catch (error) { frame.close(); onResult(null); fail(error); }
    },
    terminate() {
      disposed = true;
      clearTimeout(timeout);
      clearTimeout(retryTimer);
      worker?.terminate();
      worker = null;
    },
  };
}
