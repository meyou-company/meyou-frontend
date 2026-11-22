/**
 * Builds 1200×630 Open Graph PNG from the approved brand artwork.
 * Source: public/og/lunmeyo-og-source.jpg (do not edit favicon.png).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, '../public/og');
const sourcePath = path.join(publicDir, 'lunmeyo-og-source.jpg');
const outPath = path.join(publicDir, 'lunmeyo-og.png');
const W = 1200;
const H = 630;

async function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing OG source artwork: ${sourcePath}`);
  }

  const source = sharp(sourcePath);
  const meta = await source.metadata();
  const srcW = meta.width ?? 1024;
  const srcH = meta.height ?? 576;
  const scale = Math.min(W / srcW, H / srcH);
  const fitW = Math.round(srcW * scale);
  const fitH = Math.round(srcH * scale);
  const left = Math.round((W - fitW) / 2);
  const top = Math.round((H - fitH) / 2);

  const backdrop = await sharp(sourcePath)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .blur(14)
    .modulate({ brightness: 0.55, saturation: 1.1 })
    .toBuffer();

  const foreground = await sharp(sourcePath)
    .resize(fitW, fitH, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  await sharp(backdrop)
    .composite([{ input: foreground, left, top }])
    .png({ compressionLevel: 9, quality: 92, effort: 10 })
    .toFile(outPath);

  const outMeta = await sharp(outPath).metadata();
  if (outMeta.width !== W || outMeta.height !== H) {
    throw new Error(`Expected ${W}x${H}, got ${outMeta.width}x${outMeta.height}`);
  }

  console.log(`Wrote ${outPath} (${W}×${H}) from lunmeyo-og-source.jpg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});