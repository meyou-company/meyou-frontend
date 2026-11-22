import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(root, '../public/og/lunmeyo-og.svg');
const outPath = path.join(root, '../public/og/lunmeyo-og.png');

const svg = fs.readFileSync(svgPath);
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
fs.writeFileSync(outPath, resvg.render().asPng());
console.log(`Wrote ${outPath}`);