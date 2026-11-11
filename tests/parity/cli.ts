import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { diffImages, diffScenes, isAllowed, tailOf, totalsOf } from './compare';
import { imageFile, readScene, sceneNames } from './store';
import type { Allowance, Comparison, Finding } from './parity.types';

const GROUP_LIMIT = 25;
const SCENE_LIMIT = 40;
const LINES_PER_SCENE = 12;

const isAllowances = (value: unknown): value is Allowance[] =>
  Array.isArray(value) &&
  value.every(
    (entry: unknown) =>
      typeof entry === 'object' && entry !== null && 'reason' in entry && entry.reason !== '',
  );

const readAllowances = async (): Promise<Allowance[]> => {
  const parsed: unknown = JSON.parse(
    await readFile(new URL('./allowlist.json', import.meta.url), 'utf8'),
  );

  if (!isAllowances(parsed)) {
    throw new Error('Every allowlist entry needs a reason');
  }
  return parsed;
};

const missingScene = (scene: string, before: string, after: string): Finding => ({
  scene,
  element: '(scene)',
  property: '(scene)',
  before,
  after,
});

const compareScene = async (base: string, next: string, name: string): Promise<Finding[]> => {
  const [before, after] = await Promise.all([readScene(base, name), readScene(next, name)]);

  const [beforeImage, afterImage] = await Promise.all([
    readFile(imageFile(base, name)),
    readFile(imageFile(next, name)),
  ]);

  return [...diffScenes(before, after), ...diffImages(name, beforeImage, afterImage)];
};

const compare = async (base: string, next: string, filter: RegExp): Promise<Comparison> => {
  const allowances = await readAllowances();
  const pick = (name: string): boolean => filter.test(name);
  const [baseNames, nextNames] = await Promise.all([sceneNames(base), sceneNames(next)]);
  const known = new Set(baseNames);
  const present = new Set(nextNames);
  const findings: Finding[] = [];
  const allowed: Finding[] = [];
  const totals = { scenes: 0, elements: 0, values: 0, images: 0 };

  nextNames.forEach((name) => {
    if (pick(name) && !known.has(name)) {
      findings.push(missingScene(name, 'missing', 'present'));
    }
  });

  for (const name of baseNames.filter(pick)) {
    if (!present.has(name)) {
      findings.push(missingScene(name, 'present', 'missing'));
      continue;
    }

    const sceneTotals = totalsOf(await readScene(base, name));

    totals.scenes += 1;
    totals.images += 1;
    totals.elements += sceneTotals.elements;
    totals.values += sceneTotals.values;

    (await compareScene(base, next, name)).forEach((finding) => {
      (isAllowed(finding, allowances) ? allowed : findings).push(finding);
    });
  }

  return { ...totals, findings, allowed };
};

const countBy = (findings: readonly Finding[], key: (finding: Finding) => string): string[] => {
  const counts = findings.reduce((groups, finding) => {
    return groups.set(key(finding), (groups.get(key(finding)) ?? 0) + 1);
  }, new Map<string, number>());

  return Array.from(counts)
    .toSorted(([, left], [, right]) => right - left)
    .slice(0, GROUP_LIMIT)
    .map(([name, count]) => `  ${String(count).padStart(7)}  ${name}`);
};

const sceneLines = (findings: readonly Finding[]): string[] => {
  const byScene = findings.reduce((scenes, finding) => {
    return scenes.set(finding.scene, [...(scenes.get(finding.scene) ?? []), finding]);
  }, new Map<string, Finding[]>());

  return Array.from(byScene)
    .slice(0, SCENE_LIMIT)
    .flatMap(([scene, list]) => [
      `\n${scene}: ${list.length}`,
      ...list
        .slice(0, LINES_PER_SCENE)
        .map(
          (finding) =>
            `  ${finding.element}\n    ${finding.property}: ${finding.before} -> ${finding.after}`,
        ),
    ]);
};

const report = (result: Comparison): string => {
  const head = [
    `Scenes ${result.scenes}, elements ${result.elements}, values ${result.values}, images ${result.images}`,
    `Differences ${result.findings.length}, allowed ${result.allowed.length}`,
  ];

  if (result.findings.length === 0) {
    return head.join('\n');
  }

  return [
    ...head,
    '\nBy property',
    ...countBy(result.findings, (finding) => finding.property),
    '\nBy element and property',
    ...countBy(result.findings, (finding) => `${tailOf(finding.element)} | ${finding.property}`),
    '\nBy scene',
    ...countBy(result.findings, (finding) => finding.scene),
    ...sceneLines(result.findings),
  ].join('\n');
};

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { json: { type: 'string' }, filter: { type: 'string', default: '' } },
});

const [base, next] = positionals;

if (base === undefined || next === undefined) {
  throw new Error('Usage: node tests/parity/cli.ts <baseline dir> <current dir> [--json file]');
}

const result = await compare(base, next, new RegExp(values.filter));

console.log(report(result));

if (values.json !== undefined) {
  await writeFile(values.json, JSON.stringify(result, null, 2));
}

process.exitCode = result.findings.length === 0 ? 0 : 1;
