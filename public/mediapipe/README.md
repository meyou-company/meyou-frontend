MediaPipe Tasks Vision **0.10.32** runtime assets, served locally (no third-party CDN).

- **JavaScript SDK:** bundled from `@mediapipe/tasks-vision` into `storyFaceTracker.worker.js` (lazy-loaded with the Stories editor).
- **WASM loaders:** copied from `node_modules/@mediapipe/tasks-vision/wasm` via `scripts/sync-mediapipe-public.mjs` on `postinstall` and before `build`.
- **Face Landmarker model** (`face_landmarker.task`, float16 v1):  
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

Keep WASM files on the same package version as `package.json` (`@mediapipe/tasks-vision`).