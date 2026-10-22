import type { CellAddress, CellRange } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import { shiftFormula, shiftSpan, type LineChange } from '../formula/rewrite';
import type {
  ConditionalEntry,
  ConditionalFormat,
  ConditionalRule,
  Threshold,
} from './conditional.types';

type FormulaMap = (ast: FormulaNode) => FormulaNode;

const mappedThreshold = (threshold: Threshold, map: FormulaMap): Threshold =>
  'value' in threshold ? { ...threshold, value: map(threshold.value) } : threshold;

const mappedRule = (rule: ConditionalRule, map: FormulaMap): ConditionalRule => {
  switch (rule.kind) {
    case 'cellIs':
      return { ...rule, formulas: rule.formulas.map(map) };
    case 'expression':
      return { ...rule, formula: map(rule.formula) };
    case 'colorScale':
      return {
        ...rule,
        stops: rule.stops.map((stop) => ({
          ...stop,
          threshold: mappedThreshold(stop.threshold, map),
        })),
      };
    case 'dataBar':
      return { ...rule, min: mappedThreshold(rule.min, map), max: mappedThreshold(rule.max, map) };
    case 'iconSet':
      return { ...rule, thresholds: rule.thresholds.map((item) => mappedThreshold(item, map)) };
    case 'foreign':
      return rule.formulas === undefined ? rule : { ...rule, formulas: rule.formulas.map(map) };
    default:
      return rule;
  }
};

export const mapConditionalFormulas = (
  formats: readonly ConditionalFormat[],
  map: FormulaMap,
): ConditionalFormat[] =>
  formats.map((format) => ({
    ...format,
    rules: format.rules.map((entry): ConditionalEntry => ({
      ...entry,
      rule: mappedRule(entry.rule, map),
    })),
  }));

const anchorOf = (ranges: readonly CellRange[]): CellAddress => ({
  row: ranges[0]?.top ?? 0,
  col: ranges[0]?.left ?? 0,
});

const shiftedRange = (range: CellRange, change: LineChange): CellRange | undefined => {
  const rows = change.axis === 'rows';
  const span = shiftSpan(rows ? [range.top, range.bottom] : [range.left, range.right], change);

  if (span === undefined) {
    return undefined;
  }
  return rows
    ? { ...range, top: span[0], bottom: span[1] }
    : { ...range, left: span[0], right: span[1] };
};

const previousLine = (line: number, change: LineChange): number => {
  if (change.count > 0) {
    return line >= change.at + change.count ? line - change.count : line;
  }
  return line >= change.at ? line - change.count : line;
};

const survivorOf = (anchor: CellAddress, change: LineChange): CellAddress =>
  change.axis === 'rows'
    ? { row: previousLine(anchor.row, change), col: anchor.col }
    : { row: anchor.row, col: previousLine(anchor.col, change) };

const shiftedFormat = (
  format: ConditionalFormat,
  change: LineChange,
): ConditionalFormat | undefined => {
  const ranges = format.ranges.reduce<CellRange[]>((kept, range) => {
    const moved = shiftedRange(range, change);

    if (moved !== undefined) {
      kept.push(moved);
    }
    return kept;
  }, []);

  if (ranges.length === 0) {
    return undefined;
  }

  const survivor = survivorOf(anchorOf(ranges), change);

  return mapConditionalFormulas([{ ...format, ranges }], (ast) =>
    shiftFormula(ast, change, true, survivor),
  )[0];
};

export const shiftConditional = (
  formats: readonly ConditionalFormat[],
  change: LineChange,
): ConditionalFormat[] =>
  formats.reduce<ConditionalFormat[]>((kept, format) => {
    const moved = shiftedFormat(format, change);

    if (moved !== undefined) {
      kept.push(moved);
    }
    return kept;
  }, []);

export const shiftConditionalReferences = (
  formats: readonly ConditionalFormat[],
  change: LineChange,
): ConditionalFormat[] =>
  formats.flatMap((format) =>
    mapConditionalFormulas([format], (ast) =>
      shiftFormula(ast, change, false, anchorOf(format.ranges)),
    ),
  );
