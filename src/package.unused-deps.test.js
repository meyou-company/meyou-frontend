import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(
  readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
    'utf8',
  ),
);

describe('unused dependencies removed (018)', () => {
  it('does not list removed LiveKit UI package; keeps livekit-client and pinned MediaPipe', () => {
    expect(pkg.dependencies?.['@livekit/components-react']).toBeUndefined();
    expect(pkg.dependencies?.['@mediapipe/tasks-vision']).toBe('0.10.32');
    expect(pkg.dependencies?.['livekit-client']).toBeDefined();
  });
});