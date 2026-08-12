import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import budgets from './budgets.json' with { type: 'json' };

const chunksDirectory = path.join(process.cwd(), '.next', 'static', 'chunks');
const allFiles = (await readdir(chunksDirectory)).filter((file) => file.endsWith('.js'));
const buildManifest = JSON.parse(await readFile(path.join(process.cwd(), '.next', 'build-manifest.json'), 'utf8'));
const referenceSource = await readFile(path.join(process.cwd(), '.next', 'server', 'app', 'page_client-reference-manifest.js'), 'utf8');
const assignmentMarker = 'globalThis.__RSC_MANIFEST["/page"] = ';
const assignmentStart = referenceSource.indexOf(assignmentMarker);
const manifestStart = assignmentStart + assignmentMarker.length;
const manifestEnd = referenceSource.indexOf(';', manifestStart);
const clientReferenceManifest = JSON.parse(referenceSource.slice(manifestStart, manifestEnd));
const entryFiles = clientReferenceManifest.entryJSFiles['[project]/src/app/page'] || [];
const initialFiles = new Set([
  ...buildManifest.polyfillFiles,
  ...buildManifest.rootMainFiles,
  ...entryFiles
].map((file) => path.basename(file)));
const files = allFiles.filter((file) => initialFiles.has(file));
const chunks = await Promise.all(files.map(async (file) => {
  const contents = await readFile(path.join(chunksDirectory, file));
  return { file, rawBytes: contents.length, gzipBytes: gzipSync(contents).length };
}));

chunks.sort((a, b) => b.gzipBytes - a.gzipBytes);
const totalGzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
const largestGzipBytes = chunks[0]?.gzipBytes || 0;
const toKiB = (bytes) => Math.round(bytes / 102.4) / 10;

console.table(chunks.map((chunk) => ({
  chunk: chunk.file,
  rawKiB: toKiB(chunk.rawBytes),
  gzipKiB: toKiB(chunk.gzipBytes)
})));
console.log(`Total JavaScript: ${toKiB(totalGzipBytes)} KiB gzip`);
console.log(`Largest chunk: ${toKiB(largestGzipBytes)} KiB gzip`);
console.log(`Deferred JavaScript chunks: ${allFiles.length - files.length}`);

const failures = [];
if (toKiB(totalGzipBytes) > budgets.bundle.totalGzipKiB) {
  failures.push(`total gzip JavaScript exceeds ${budgets.bundle.totalGzipKiB} KiB`);
}
if (toKiB(largestGzipBytes) > budgets.bundle.largestGzipKiB) {
  failures.push(`largest gzip chunk exceeds ${budgets.bundle.largestGzipKiB} KiB`);
}
if (failures.length) {
  console.error(`Bundle budget failed: ${failures.join('; ')}`);
  process.exitCode = 1;
}
