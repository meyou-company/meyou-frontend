#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const assetsDir = join(dist, 'assets');

function gzipSize(buffer) {
  return zlib.gzipSync(buffer).length;
}

function measure() {
  const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
  const scriptRefs = [...indexHtml.matchAll(/src="\/assets\/([^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  const cssRefs = [...indexHtml.matchAll(/href="\/assets\/([^"]+\.css)"/g)].map(
    (m) => m[1],
  );

  const chunks = [];
  for (const name of readdirSync(assetsDir)) {
    if (!/\.(js|css)$/.test(name)) continue;
    const path = join(assetsDir, name);
    const buf = readFileSync(path);
    chunks.push({
      name,
      type: name.endsWith('.js') ? 'js' : 'css',
      bytes: buf.length,
      gzipBytes: gzipSize(buf),
      entryLinked: scriptRefs.includes(name) || cssRefs.includes(name),
    });
  }

  chunks.sort((a, b) => b.bytes - a.bytes);
  const jsChunks = chunks.filter((c) => c.type === 'js');
  const cssChunks = chunks.filter((c) => c.type === 'css');

  const initialJs = jsChunks
    .filter((c) => c.entryLinked)
    .reduce((sum, c) => sum + c.bytes, 0);
  const initialJsGzip = jsChunks
    .filter((c) => c.entryLinked)
    .reduce((sum, c) => sum + c.gzipBytes, 0);
  const initialCss = cssChunks
    .filter((c) => c.entryLinked)
    .reduce((sum, c) => sum + c.bytes, 0);
  const initialCssGzip = cssChunks
    .filter((c) => c.entryLinked)
    .reduce((sum, c) => sum + c.gzipBytes, 0);

  const report = {
    entryScripts: scriptRefs,
    entryStyles: cssRefs,
    initialJsKB: +(initialJs / 1024).toFixed(2),
    initialJsGzipKB: +(initialJsGzip / 1024).toFixed(2),
    initialCssKB: +(initialCss / 1024).toFixed(2),
    initialCssGzipKB: +(initialCssGzip / 1024).toFixed(2),
    totalJsKB: +(jsChunks.reduce((s, c) => s + c.bytes, 0) / 1024).toFixed(2),
    totalCssKB: +(cssChunks.reduce((s, c) => s + c.bytes, 0) / 1024).toFixed(2),
    jsChunkCount: jsChunks.length,
    asyncJsChunks: jsChunks
      .filter((c) => !c.entryLinked)
      .map((c) => ({
        name: c.name,
        kb: +(c.bytes / 1024).toFixed(2),
        gzipKB: +(c.gzipBytes / 1024).toFixed(2),
      })),
    allChunks: chunks.map((c) => ({
      name: c.name,
      type: c.type,
      kb: +(c.bytes / 1024).toFixed(2),
      gzipKB: +(c.gzipBytes / 1024).toFixed(2),
      entryLinked: c.entryLinked,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

measure();