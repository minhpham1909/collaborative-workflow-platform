import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = resolve(import.meta.dirname, '../dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
assert.ok(entry, 'Built HTML must have a JavaScript entry');
const initial = new Set();
async function visit(file) {
  const path = resolve(file);
  assert.ok(path.startsWith(dist + '/'.replace('/', process.platform === 'win32' ? '\\' : '/')), 'Asset must stay inside dist');
  if (initial.has(path)) return;
  initial.add(path);
  const source = await readFile(path, 'utf8');
  for (const match of source.matchAll(/\b(?:from\s*|import\s*)["'](\.[^"']+\.js)["']/g)) await visit(resolve(dirname(path), match[1]));
}
await visit(resolve(dist, entry.replace(/^\//, '')));
for (const match of html.matchAll(/rel="modulepreload"[^>]+href="([^"]+\.js)"/g)) await visit(resolve(dist, match[1].replace(/^\//, '')));
let raw = 0, gzip = 0;
for (const path of initial) { const bytes = await readFile(path); raw += bytes.length; gzip += gzipSync(bytes).length; }
let largest = 0;
for (const file of await readdir(resolve(dist, 'assets'))) if (file.endsWith('.js')) largest = Math.max(largest, (await readFile(resolve(dist, 'assets', file))).length);
const entryBytes = (await readFile(resolve(dist, entry.replace(/^\//, '')))).length;
assert.ok(entryBytes <= 350_000, `Entry exceeds 350kB: ${entryBytes}`);
assert.ok(raw <= 425_000, `Initial entry and static dependencies exceed 425kB: ${raw}`);
assert.ok(gzip <= 135_000, `Initial gzip estimate exceeds 135kB: ${gzip}`);
assert.ok(largest <= 500_000, `A JavaScript chunk exceeds 500kB: ${largest}`);
console.log(JSON.stringify({ entry: basename(entry), entryBytes, initialBytes: raw, initialGzipBytes: gzip, largestChunkBytes: largest, initialChunks: initial.size }));
