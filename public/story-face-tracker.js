// Classic worker: MediaPipe's WASM loader requires importScripts().
let landmarker;
let initializing;

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    if (initializing) return;
    initializing = (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('./mediapipe/vision_bundle.mjs');
        const vision = await FilesetResolver.forVisionTasks(new URL('./mediapipe', self.location.href).href);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: new URL('./mediapipe/face_landmarker.task', self.location.href).href,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        self.postMessage({ type: 'ready' });
      } catch (error) {
        self.postMessage({ type: 'error', stage: 'init', message: String(error?.message || error) });
      }
    })();
    return;
  }

  if (data.type === 'frame') {
    try {
      if (!landmarker) throw new Error('Face tracker is not ready');
      const result = landmarker.detectForVideo(data.frame, data.timestamp);
      self.postMessage({ type: 'result', landmarks: result.faceLandmarks[0] || null });
    } catch (error) {
      self.postMessage({ type: 'error', stage: 'frame', message: String(error?.message || error) });
    } finally {
      data.frame.close();
    }
  }
};
