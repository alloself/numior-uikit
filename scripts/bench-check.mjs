import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [, , pkg] = process.argv;

if (!pkg) {
  console.error('usage: node scripts/bench-check.mjs <package>');
  process.exit(1);
}

const dir = resolve(`packages/${pkg}/bench/results`);
const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).toSorted();
const latest = files.at(-1);

if (!latest) {
  console.error(`bench: no results in ${dir}; run pnpm bench:engine first`);
  process.exit(1);
}

const record = JSON.parse(await readFile(resolve(dir, latest), 'utf8'));

const thresholds = JSON.parse(
  await readFile(resolve(`packages/${pkg}/bench/thresholds.json`), 'utf8'),
);

const failures = [];

for (const [name, limit] of Object.entries(thresholds)) {
  const operation = record.operations.find((entry) => entry.name === name);

  if (!operation) {
    failures.push(`${name}: missing from ${latest}`);
    continue;
  }
  if (typeof limit.p95Ms === 'number' && operation.p95Ms > limit.p95Ms) {
    failures.push(`${name}: p95 ${operation.p95Ms.toFixed(1)} ms exceeds ${limit.p95Ms} ms`);
  }
  if (typeof limit.maxMs === 'number' && operation.maxMs > limit.maxMs) {
    failures.push(`${name}: max ${operation.maxMs.toFixed(1)} ms exceeds ${limit.maxMs} ms`);
  }
}

if (failures.length > 0) {
  console.error(`bench: ${latest} breaks thresholds\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(`bench: ${latest} within thresholds (${Object.keys(thresholds).length} operations)`);
