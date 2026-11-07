import { FillPattern, StyleColorKind, type CellRange } from '../cell.types';
import type { BorderSide, BorderStyle, StyleColor } from '../decorations';
import type {
  ConditionalEntry,
  ConditionalFormat,
  ConditionalPreset,
  ConditionalRule,
  PlacedRule,
  RuleDraft,
} from './conditional.types';

const THIN = 'thin';

const DARK_RED = '9C0006';

const rgb = (hex: string): StyleColor => ({ kind: StyleColorKind.Rgb, argb: `FF${hex}` });

const solid = (hex: string) => ({ pattern: FillPattern.Solid, background: rgb(hex) });

const RED_SIDE: BorderSide = { style: THIN, color: rgb(DARK_RED) };

const RED_BORDER: BorderStyle = {
  top: RED_SIDE,
  bottom: RED_SIDE,
  left: RED_SIDE,
  right: RED_SIDE,
};

export const CONDITIONAL_PRESETS: readonly ConditionalPreset[] = [
  { key: 'redText', style: { fill: solid('FFC7CE'), font: { color: rgb(DARK_RED) } } },
  { key: 'yellowText', style: { fill: solid('FFEB9C'), font: { color: rgb('9C5700') } } },
  { key: 'greenText', style: { fill: solid('C6EFCE'), font: { color: rgb('006100') } } },
  { key: 'redFill', style: { fill: solid('FFC7CE') } },
  { key: 'redFont', style: { font: { color: rgb(DARK_RED) } } },
  { key: 'redBorder', style: { border: RED_BORDER } },
];

export const rulesOf = (formats: readonly ConditionalFormat[]): PlacedRule[] =>
  formats
    .flatMap((format) => format.rules.map((entry) => ({ ranges: format.ranges, entry })))
    .toSorted((left, right) => left.entry.priority - right.entry.priority);

const ranked = (rules: readonly PlacedRule[]): ConditionalFormat[] => {
  const formats = new Map<readonly CellRange[], ConditionalEntry[]>();

  rules.forEach(({ ranges, entry }, index) => {
    const known = formats.get(ranges) ?? [];

    known.push({ ...entry, priority: index + 1 });
    formats.set(ranges, known);
  });

  return [...formats].map(([ranges, entries]) => ({ ranges, rules: entries }));
};

const kept = (
  formats: readonly ConditionalFormat[],
  rules: readonly PlacedRule[],
): ConditionalFormat[] => {
  const extensions = new Map(formats.map((format) => [format.ranges, format.extension]));

  return ranked(rules).map((format) => {
    const extension = extensions.get(format.ranges);

    return extension === undefined ? format : { ...format, extension };
  });
};

export const moveRule = (
  formats: readonly ConditionalFormat[],
  from: number,
  to: number,
): ConditionalFormat[] => {
  const rules = rulesOf(formats);
  const [moved] = rules.splice(from, 1);

  if (moved === undefined) {
    return [...formats];
  }
  rules.splice(Math.min(Math.max(to, 0), rules.length), 0, moved);
  return kept(formats, rules);
};

export const removeRule = (
  formats: readonly ConditionalFormat[],
  entry: ConditionalEntry,
): ConditionalFormat[] =>
  kept(
    formats,
    rulesOf(formats).filter((placed) => placed.entry !== entry),
  );

const draftEntry = (draft: RuleDraft, rule: ConditionalRule): ConditionalEntry => ({
  rule,
  priority: 0,
  stopIfTrue: draft.stopIfTrue,
});

const sameRange = (left: CellRange, right: CellRange | undefined): boolean =>
  right !== undefined &&
  left.top === right.top &&
  left.left === right.left &&
  left.bottom === right.bottom &&
  left.right === right.right;

const sameRanges = (left: readonly CellRange[] | undefined, right: readonly CellRange[]): boolean =>
  left !== undefined &&
  left.length === right.length &&
  left.every((range, index) => sameRange(range, right[index]));

export const putRule = (
  formats: readonly ConditionalFormat[],
  draft: RuleDraft,
  replacing?: ConditionalEntry,
): ConditionalFormat[] => {
  const rules = rulesOf(formats);
  const at = rules.findIndex((placed) => placed.entry === replacing);
  const placed = { ranges: draft.ranges, entry: draftEntry(draft, draft.rule) };

  if (at < 0) {
    return kept(formats, [placed, ...rules]);
  }

  const before = rules[at];

  rules.splice(at, 1, {
    ranges: sameRanges(before?.ranges, draft.ranges)
      ? (before?.ranges ?? draft.ranges)
      : draft.ranges,
    entry: placed.entry,
  });

  return kept(formats, rules);
};

export const touches = (ranges: readonly CellRange[], area: readonly CellRange[]): boolean =>
  ranges.some((range) =>
    area.some(
      (other) =>
        range.top <= other.bottom &&
        other.top <= range.bottom &&
        range.left <= other.right &&
        other.left <= range.right,
    ),
  );
