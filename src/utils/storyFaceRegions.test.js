import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStoryFaceRegions } from './storyFaceRegions.js';

test('face regions use source coordinates and invert vertical texture coordinates', () => {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  landmarks[234] = { x: 0.2, y: 0.5 };
  landmarks[454] = { x: 0.8, y: 0.5 };
  landmarks[10] = { x: 0.5, y: 0.1 };
  landmarks[152] = { x: 0.5, y: 0.9 };
  landmarks[159] = { x: 0.35, y: 0.3 };
  const result = getStoryFaceRegions(landmarks);
  assert.deepEqual(result.leftEye, [0.35, 0.7]);
  assert.equal(result.face[0], 0.5);
  assert.equal(result.face[1], 0.5);
  assert.ok(result.face[2] > 0 && result.face[3] > 0);
});

test('no face landmarks produce no beauty mask', () => {
  assert.equal(getStoryFaceRegions(null), null);
  assert.equal(getStoryFaceRegions([]), null);
});
