import { describePixelDiff, decodePng } from './png';
import { styleOf } from './store';
import type {
  Allowance,
  Finding,
  Note,
  SceneTotals,
  StoredNode,
  StoredScene,
} from './parity.types';

const ELEMENT = '(element)';
const RECT = '(rect)';
const PIXELS = '(pixels)';
const ABSENT = '(absent)';
const NOTE_SEPARATOR = ' | ';

const pathsOf = (scene: StoredScene): Map<string, StoredNode> => {
  const paths: string[] = [];
  const byPath = new Map<string, StoredNode>();

  scene.nodes.forEach((node) => {
    const [parent, segment] = node;
    const path = parent < 0 ? segment : `${paths[parent] ?? ''} > ${segment}`;

    paths.push(path);
    byPath.set(path, node);
  });

  return byPath;
};

const parentOf = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf(' > ')));

const orphans = (
  scene: string,
  own: ReadonlyMap<string, StoredNode>,
  other: ReadonlyMap<string, StoredNode>,
  [before, after]: readonly [string, string],
): Finding[] => {
  return Array.from(own.keys()).reduce<Finding[]>((findings, path) => {
    const parent = parentOf(path);
    const topmost = parent === '' || other.has(parent);

    if (!other.has(path) && topmost) {
      findings.push({ scene, element: path, property: ELEMENT, before, after });
    }
    return findings;
  }, []);
};

const nodeFindings = (
  base: StoredScene,
  next: StoredScene,
  path: string,
  [before, after]: readonly [StoredNode, StoredNode],
): Finding[] => {
  const findings: Finding[] = [];
  const beforeStyle = styleOf(base, before);
  const afterStyle = styleOf(next, after);

  if (before[2] !== after[2]) {
    findings.push({
      scene: base.name,
      element: path,
      property: RECT,
      before: before[2],
      after: after[2],
    });
  }

  base.properties.forEach((property, index) => {
    const [was = '', now = ''] = [beforeStyle[index], afterStyle[index]];

    if (was !== now) {
      findings.push({ scene: base.name, element: path, property, before: was, after: now });
    }
  });

  return findings;
};

const noteFinding = (scene: string, subject: string, before: string, after: string): Finding => {
  const cut = subject.lastIndexOf(NOTE_SEPARATOR);

  return {
    scene,
    element: subject.slice(0, cut),
    property: subject.slice(cut + NOTE_SEPARATOR.length),
    before,
    after,
  };
};

const noteFindings = (scene: string, base: readonly Note[], next: readonly Note[]): Finding[] => {
  const before = new Map(base);
  const after = new Map(next);
  const subjects = new Set([...before.keys(), ...after.keys()]);

  return Array.from(subjects).reduce<Finding[]>((findings, subject) => {
    const [was = ABSENT, now = ABSENT] = [before.get(subject), after.get(subject)];

    if (was !== now) {
      findings.push(noteFinding(scene, subject, was, now));
    }
    return findings;
  }, []);
};

export const diffScenes = (base: StoredScene, next: StoredScene): Finding[] => {
  if (base.properties.join() !== next.properties.join()) {
    throw new Error(`Property lists differ in ${base.name}: retake the baseline`);
  }

  const before = pathsOf(base);
  const after = pathsOf(next);

  const findings = [
    ...orphans(base.name, before, after, ['present', 'missing']),
    ...orphans(base.name, after, before, ['missing', 'present']),
    ...noteFindings(base.name, base.notes, next.notes),
  ];

  before.forEach((node, path) => {
    const pair = after.get(path);

    if (pair !== undefined) {
      findings.push(...nodeFindings(base, next, path, [node, pair]));
    }
  });

  return findings;
};

export const diffImages = (scene: string, base: Uint8Array, next: Uint8Array): Finding[] => {
  if (Buffer.from(base).equals(Buffer.from(next))) {
    return [];
  }

  const difference = describePixelDiff(decodePng(base), decodePng(next));

  return difference === null
    ? []
    : [{ scene, element: PIXELS, property: 'png', before: 'baseline', after: difference }];
};

export const totalsOf = (scene: StoredScene): SceneTotals => ({
  elements: scene.nodes.length,
  values: scene.nodes.length * (scene.properties.length + 1) + scene.notes.length,
});

const matches = (pattern: string | undefined, text: string): boolean =>
  pattern === undefined || new RegExp(pattern).test(text);

export const isAllowed = (finding: Finding, allowances: readonly Allowance[]): boolean => {
  return allowances.some(
    (allowance) =>
      matches(allowance.scene, finding.scene) &&
      matches(allowance.element, finding.element) &&
      matches(allowance.property, finding.property),
  );
};

export const tailOf = (element: string): string => {
  const cut = element.lastIndexOf(' > ');
  const last = cut < 0 ? element : element.slice(cut + 3);
  const owner = last.startsWith('::') ? `${tailOf(parentOf(element))}${last}` : last;

  return owner.replace(/:\d+/g, '');
};
