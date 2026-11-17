import {
  canonicalLonghand,
  discreteBehavior,
  gridAlignment,
  isGridDisplay,
  unpainted,
  withoutSingleRepeats,
} from './css-values.ts';
import { describePixelDiff, decodePng } from './png.ts';
import { styleOf } from './store.ts';
import type {
  Allowance,
  ClassChange,
  Finding,
  Note,
  SceneTotals,
  StoredNode,
  StoredScene,
} from './parity.types.ts';

interface IgnoredClasses {
  readonly pattern: RegExp;
  readonly dropped: ReadonlySet<string>;
}

const ELEMENT = '(element)';
const RECT = '(rect)';
const PIXELS = '(pixels)';
const ABSENT = '(absent)';
const NOTE_SEPARATOR = ' | ';
const PATH_SEPARATOR = ' > ';
const LAYER_SEPARATOR = ', ';
const ZERO_OFFSET = /^0(?:px|%)$/;
const ORIGIN_OFFSETS = new Set(['background-position-x', 'background-position-y']);

const zeroed = (value: string): string =>
  value
    .split(LAYER_SEPARATOR)
    .map((offset) => (ZERO_OFFSET.test(offset) ? '0' : offset))
    .join(LAYER_SEPARATOR);

const TRACK_LISTS = new Set(['grid-template-columns', 'grid-template-rows']);

const canonicalValue = (property: string, value: string, grid: boolean): string => {
  if (ORIGIN_OFFSETS.has(property)) {
    return zeroed(value);
  }

  if (TRACK_LISTS.has(property)) {
    return withoutSingleRepeats(value);
  }

  return grid ? gridAlignment(property, value) : canonicalLonghand(property, value);
};

const sameValue = (property: string, [was, now]: readonly string[], grid: boolean): boolean =>
  was === now ||
  canonicalValue(property, was ?? '', grid) === canonicalValue(property, now ?? '', grid);

const behaviors = (
  property: string,
  values: readonly (string | undefined)[],
  styles: readonly ReadonlyMap<string, string>[],
): string[] =>
  values.map((value = '', at) =>
    property === 'transition-behavior'
      ? discreteBehavior(styles[at]?.get('transition-property') ?? 'all', value)
      : value,
  );

const withoutDropped = (segment: string, ignored: readonly IgnoredClasses[]): string => {
  const cut = segment.lastIndexOf(':');
  const head = cut > 0 ? segment.slice(0, cut) : segment;
  const match = ignored.find(({ pattern }) => pattern.test(head));

  if (match === undefined) {
    return segment;
  }

  const kept = head.split('.').filter((name, index) => index === 0 || !match.dropped.has(name));

  return `${kept.join('.')}${segment.slice(head.length)}`;
};

const pathsOf = (
  scene: StoredScene,
  ignored: readonly IgnoredClasses[],
): Map<string, StoredNode> => {
  const paths: string[] = [];
  const byPath = new Map<string, StoredNode>();

  scene.nodes.forEach((node) => {
    const [parent, own] = node;
    const segment = ignored.length === 0 ? own : withoutDropped(own, ignored);
    const path = parent < 0 ? segment : `${paths[parent] ?? ''}${PATH_SEPARATOR}${segment}`;

    paths.push(path);
    byPath.set(path, node);
  });

  return byPath;
};

const parentOf = (path: string): string =>
  path.slice(0, Math.max(0, path.lastIndexOf(PATH_SEPARATOR)));

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

const styleMap = (properties: readonly string[], values: readonly string[]): Map<string, string> =>
  new Map(properties.map((property, at) => [property, values[at] ?? '']));

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

  const display = base.properties.indexOf('display');
  const grid = isGridDisplay(beforeStyle[display]) && isGridDisplay(afterStyle[display]);
  const painted = [styleMap(base.properties, beforeStyle), styleMap(base.properties, afterStyle)];

  base.properties.forEach((property, index) => {
    const [was = '', now = ''] = behaviors(
      property,
      [beforeStyle[index], afterStyle[index]],
      painted,
    );

    const inert = painted.every((values) => unpainted(property, values));

    if (sameValue(property, [was, now], grid) || inert) {
      return;
    }

    findings.push({ scene: base.name, element: path, property, before: was, after: now });
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

const subjectWithoutDropped = (subject: string, ignored: readonly IgnoredClasses[]): string => {
  const cut = subject.lastIndexOf(NOTE_SEPARATOR);

  const element = subject
    .slice(0, cut)
    .split(PATH_SEPARATOR)
    .map((segment) => withoutDropped(segment, ignored))
    .join(PATH_SEPARATOR);

  return `${element}${subject.slice(cut)}`;
};

const notesBySubject = (
  notes: readonly Note[],
  ignored: readonly IgnoredClasses[],
): Map<string, string> =>
  new Map(notes.map(([subject, value]) => [subjectWithoutDropped(subject, ignored), value]));

const noteFindings = (
  scene: string,
  [base, next]: readonly [readonly Note[], readonly Note[]],
  ignored: readonly IgnoredClasses[],
): Finding[] => {
  const before = notesBySubject(base, ignored);
  const after = notesBySubject(next, ignored);
  const subjects = new Set([...before.keys(), ...after.keys()]);

  return Array.from(subjects).reduce<Finding[]>((findings, subject) => {
    const [was = ABSENT, now = ABSENT] = [before.get(subject), after.get(subject)];

    if (was !== now) {
      findings.push(noteFinding(scene, subject, was, now));
    }
    return findings;
  }, []);
};

export const diffScenes = (
  base: StoredScene,
  next: StoredScene,
  changes: readonly ClassChange[] = [],
): Finding[] => {
  if (base.properties.join() !== next.properties.join()) {
    throw new Error(`Property lists differ in ${base.name}: retake the baseline`);
  }

  const ignored = changes.map(({ element, dropped }) => ({
    pattern: new RegExp(element),
    dropped: new Set(dropped),
  }));

  const before = pathsOf(base, ignored);
  const after = pathsOf(next, ignored);

  const findings = [
    ...orphans(base.name, before, after, ['present', 'missing']),
    ...orphans(base.name, after, before, ['missing', 'present']),
    ...noteFindings(base.name, [base.notes, next.notes], ignored),
  ];

  before.forEach((node, path) => {
    const pair = after.get(path);

    if (pair === undefined) {
      return;
    }

    findings.push(...nodeFindings(base, next, path, [node, pair]));
  });

  return findings;
};

export const diffImages = (
  scene: string,
  base: Uint8Array | undefined,
  next: Uint8Array | undefined,
): Finding[] => {
  if (base === undefined || next === undefined) {
    return base === next
      ? []
      : [
          {
            scene,
            element: PIXELS,
            property: 'png',
            before: base === undefined ? 'missing' : 'present',
            after: next === undefined ? 'missing' : 'present',
          },
        ];
  }

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
