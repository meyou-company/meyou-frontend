MediaPipe Tasks Vision 0.10.32 runtime, distributed under Apache-2.0.
Source: https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.32

Face Landmarker model (float16, version 1):
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

These files are served locally so Beauty does not depend on a third-party CDN.
Keep vision_bundle.mjs and all vision_wasm* files on the same package version.
The tracker must run as a classic worker because the WASM loader uses importScripts.
