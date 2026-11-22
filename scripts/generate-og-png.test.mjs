import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const root = path.dirname(fileURLToPath(import.meta.url));
const pngPath = path.join(root, '../public/og/lunmeyo-og.png');

describe('lunmeyo-og.png', () => {
  it('is exactly 1200×630', async () => {
    expect(fs.existsSync(pngPath)).toBe(true);
    const meta = await sharp(pngPath).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe('png');
  });
});