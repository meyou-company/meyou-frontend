#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const assetsDir = join(dist, 'assets');

function gzipSize(buffer) {
  return zlib.gzipSync(buffer).length;
}

/** Synchronous ESM imports inside a Rollup/Vite chunk (not dynamic import()). */
function findStaticChunkImports(source, chunkFile) {
  const found = new Set();
  const baseDir = dirname(join(assetsDir, chunkFile));

  const patterns = [
    /from"\.\/([^"]+\.js)"/g,
    /import"\.\/([^"]+\.js)"/g,
    /from"\/assets\/([^"]+\.js)"/g,
    /import"\/assets\/([^"]+\.js)"/g,
  ];

  for (const re of patterns) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(source)) !== null) {
      const rel = match[1].startsWith('assets/') ? match[1] : match[1];
      const resolved = normalize(join(baseDir, rel));
      const name = resolved.replace(`${assetsDir}/`, '').replace(/^assets\//, '');
      if (name.endsWith('.js') && existsSync(join(assetsDir, name.split('/').pop()))) {
        found.add(name.split('/').pop());
      } else if (existsSync(join(assetsDir, rel))) {
        found.add(rel);
      }
    }
  }

  return [...found];
}

function findStaticCssImports(source, chunkFile) {
  const found = new Set();
  const baseDir = dirname(join(assetsDir, chunkFile));
  const re = /import"\.\/([^"]+\.css)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const resolved = normalize(join(baseDir, match[1]));
    const name = resolved.replace(`${assetsDir}/`, '');
    if (existsSync(join(assetsDir, name))) found.add(name);
    else if (existsSync(join(assetsDir, match[1]))) found.add(match[1]);
  }
  return [...found];
}

function collectInitialGraph(entryJsFiles) {
  const visitedJs = new Set();
  const visitedCss = new Set();
  const queue = [...entryJsFiles];

  while (queue.length) {
    const file = queue.shift();
    if (visitedJs.has(file)) continue;
    visitedJs.add(file);
    const path = join(assetsDir, file);
    if (!existsSync(path)) continue;
    const src = readFileSync(path, 'utf8');
    for (const dep of findStaticChunkImports(src, file)) {
      if (!visitedJs.has(dep)) queue.push(dep);
    }
    for (const css of findStaticCssImports(src, file)) {
      visitedCss.add(css);
    }
  }

  return { visitedJs, visitedCss };
}

function measure() {
  const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
  const scriptRefs = [...indexHtml.matchAll(/src="\/assets\/([^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  const cssRefs = [...indexHtml.matchAll(/href="\/assets\/([^"]+\.css)"/g)].map(
    (m) => m[1],
  );
  const modulePreloads = [
    ...indexHtml.matchAll(/rel="modulepreload"[^>]+href="\/assets\/([^"]+\.js)"/g),
  ].map((m) => m[1]);

  const entryJsSeeds = [...new Set([...scriptRefs, ...modulePreloads])];
  const graph = collectInitialGraph(entryJsSeeds);
  const initialJsFiles = [...graph.visitedJs];
  const initialCssFiles = [...new Set([...cssRefs, ...graph.visitedCss])];

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
      inInitialGraph:
        (name.endsWith('.js') && initialJsFiles.includes(name)) ||
        (name.endsWith('.css') && initialCssFiles.includes(name)),
      htmlEntry: scriptRefs.includes(name) || cssRefs.includes(name),
      modulePreload: modulePreloads.includes(name),
    });
  }

  const sum = (list, field) => list.reduce((s, c) => s + c[field], 0);
  const jsChunks = chunks.filter((c) => c.type === 'js');
  const cssChunks = chunks.filter((c) => c.type === 'css');
  const initialJsList = jsChunks.filter((c) => c.inInitialGraph);
  const initialCssList = cssChunks.filter((c) => c.inInitialGraph);

  const livekitInInitial = initialJsFiles.some((name) =>
    name.includes('livekit-client'),
  );

  const report = {
    entryScripts: scriptRefs,
    modulePreload: modulePreloads,
    entryStyles: cssRefs,
    initialJsGraphFiles: initialJsFiles.sort(),
    initialCssGraphFiles: initialCssFiles.sort(),
    initialJsKB: +(sum(initialJsList, 'bytes') / 1024).toFixed(2),
    initialJsGzipKB: +(sum(initialJsList, 'gzipBytes') / 1024).toFixed(2),
    initialCssKB: +(sum(initialCssList, 'bytes') / 1024).toFixed(2),
    initialCssGzipKB: +(sum(initialCssList, 'gzipBytes') / 1024).toFixed(2),
    htmlOnlyJsKB: +(
      sum(
        jsChunks.filter((c) => c.htmlEntry || c.modulePreload),
        'bytes',
      ) / 1024
    ).toFixed(2),
    totalJsKB: +(sum(jsChunks, 'bytes') / 1024).toFixed(2),
    totalCssKB: +(sum(cssChunks, 'bytes') / 1024).toFixed(2),
    jsChunkCount: jsChunks.length,
    livekitInInitialGraph: livekitInInitial,
    asyncJsChunks: jsChunks
      .filter((c) => !c.inInitialGraph)
      .map((c) => ({
        name: c.name,
        kb: +(c.bytes / 1024).toFixed(2),
        gzipKB: +(c.gzipBytes / 1024).toFixed(2),
      })),
  };

  console.log(JSON.stringify(report, null, 2));
}

measure();