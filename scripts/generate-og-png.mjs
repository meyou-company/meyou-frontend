/**
 * Builds 1200×630 Open Graph PNG for social previews only.
 * Logo: public/Logo/lunmeyo.jpg (hi-res brand lockup; same identity as public/favicon.png).
 * Does NOT modify favicon.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, '../public');
const logoPath = path.join(publicDir, 'Logo/lunmeyo.jpg');
const outPath = path.join(publicDir, 'og/lunmeyo-og.png');
const W = 1200;
const H = 630;

const backgroundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#120b24"/>
      <stop offset="45%" stop-color="#251547"/>
      <stop offset="78%" stop-color="#5c3d9e"/>
      <stop offset="100%" stop-color="#c73aab"/>
    </linearGradient>
    <radialGradient id="glow1" cx="82%" cy="18%" r="45%">
      <stop offset="0%" stop-color="#ff6bcb" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ff6bcb" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="12%" cy="88%" r="40%">
      <stop offset="0%" stop-color="#6b5ce0" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#6b5ce0" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft">
      <feGaussianBlur stdDeviation="40" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  <circle cx="1040" cy="90" r="140" fill="#e040b8" opacity="0.12" filter="url(#soft)"/>
  <circle cx="140" cy="540" r="160" fill="#7b5cff" opacity="0.14" filter="url(#soft)"/>
</svg>`;

const textOverlaySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <text x="500" y="200" font-family="Montserrat, Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#ffffff">
    Соціальна мережа нового покоління
  </text>
  <text x="500" y="268" font-family="Montserrat, Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="#f0b8ff">
    Знайомся • Спілкуйся • Ділися моментами
  </text>
  <text x="500" y="340" font-family="Montserrat, Arial, Helvetica, sans-serif" font-size="22" font-weight="400" fill="#d8ccff" opacity="0.92">
    Знайомся, спілкуйся, ділися фото та відео разом із LUNMEYO.
  </text>
  <text x="500" y="560" font-family="Montserrat, Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="#ffffff" opacity="0.7">lunmeyo.com</text>
</svg>`;

async function main() {
  if (!fs.existsSync(logoPath)) {
    throw new Error(`Missing brand logo: ${logoPath}`);
  }

  const logoHeight = 440;
  const logoBuffer = await sharp(logoPath)
    .resize({ height: logoHeight, fit: 'inside' })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoWidth = logoMeta.width ?? 400;
  const logoLeft = Math.round((460 - logoWidth) / 2) + 20;
  const logoTop = Math.round((H - (logoMeta.height ?? logoHeight)) / 2);

  const textLayer = await sharp(Buffer.from(textOverlaySvg)).png().toBuffer();

  const png = await sharp(Buffer.from(backgroundSvg))
    .composite([
      { input: logoBuffer, left: Math.max(48, logoLeft), top: logoTop },
      { input: textLayer, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  void png;
  console.log(`Wrote ${outPath} (${W}×${H}) using Logo/lunmeyo.jpg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});