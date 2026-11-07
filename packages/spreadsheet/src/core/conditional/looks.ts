import { MAX_COLS } from '../address';
import type { Calculator } from '../calc/calculator';
import { compareValues } from '../calc/coerce';
import { civilOf, mondayIndex } from '../calc/serials';
import { CellValueKind, type CellAddress, type CellRange, type CellValue } from '../cell.types';
import { lookupKey } from '../calc/coerce';
import type { FormulaNode } from '../formula/formula.types';
import type { Sheet } from '../workbook';
import {
  CellIsOperator,
  ConditionalRuleKind,
  TextOperator,
  ThresholdKind,
  type ConditionalEntry,
  type ConditionalFormat,
  type ConditionalLook,
  type ConditionalRule,
  type DifferentialStyle,
  type ScaleStop,
  type Threshold,
  type TimePeriod,
} from './conditional.types';
import { createRangeStats, percentileOf, type RangeStats } from './stats';

export interface ConditionalPainter {
  looks(sheet: Sheet, range: CellRange): ReadonlyMap<number, ConditionalLook>;
}

interface Probe {
  readonly value: CellValue;
  readonly format: ConditionalFormat;
  readonly evaluate: (ast: FormulaNode) => CellValue;
  readonly threshold: (threshold: Threshold) => number | undefined;
  readonly stats: () => RangeStats;
  readonly today: () => number;
}

interface Placed {
  readonly format: ConditionalFormat;
  readonly entry: ConditionalEntry;
}

type StyledRule = Extract<ConditionalRule, { readonly style: DifferentialStyle }>;

type ValueTest = Extract<
  StyledRule,
  {
    readonly kind:
      | typeof ConditionalRuleKind.Duplicates
      | typeof ConditionalRuleKind.Uniques
      | typeof ConditionalRuleKind.Blanks
      | typeof ConditionalRuleKind.Filled
      | typeof ConditionalRuleKind.Errors
      | typeof ConditionalRuleKind.NoErrors;
  }
>['kind'];

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const MIN_BAR = 0.1;

const MAX_BAR = 0.9;

const TODAY: FormulaNode = { kind: 'call', name: 'TODAY', args: [] };

const numberOf = (value: CellValue): number | undefined =>
  value.kind === CellValueKind.Number ? value.value : undefined;

const truthy = (value: CellValue): boolean =>
  value.kind === CellValueKind.Boolean
    ? value.value
    : value.kind === CellValueKind.Number && value.value !== 0;

const compared = (value: CellValue, operand: CellValue): number | undefined =>
  value.kind === CellValueKind.Error || operand.kind === CellValueKind.Error
    ? undefined
    : compareValues(value, operand);

const OPERATORS: Readonly<
  Record<Exclude<CellIsOperator, 'between' | 'notBetween'>, (order: number) => boolean>
> = {
  equal: (order) => order === 0,
  notEqual: (order) => order !== 0,
  greaterThan: (order) => order > 0,
  lessThan: (order) => order < 0,
  greaterThanOrEqual: (order) => order >= 0,
  lessThanOrEqual: (order) => order <= 0,
};

const between = (value: CellValue, low: CellValue, high: CellValue): boolean => {
  const fromLow = compared(value, low);
  const fromHigh = compared(value, high);

  return (
    fromLow !== undefined &&
    fromHigh !== undefined &&
    ((fromLow >= 0 && fromHigh <= 0) || (fromLow <= 0 && fromHigh >= 0))
  );
};

const cellIs = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.CellIs }>,
  probe: Probe,
) => {
  const [first, second] = rule.formulas.map(probe.evaluate);

  if (first === undefined || probe.value.kind === CellValueKind.Error) {
    return false;
  }
  if (rule.operator === CellIsOperator.Between || rule.operator === CellIsOperator.NotBetween) {
    return (
      (second !== undefined && between(probe.value, first, second)) ===
      (rule.operator === CellIsOperator.Between)
    );
  }

  const order = compared(probe.value, first);

  return order !== undefined && OPERATORS[rule.operator](order);
};

const topCutoff = (stats: RangeStats, rank: number, percent: boolean, bottom: boolean) => {
  const total = stats.count();
  const count = percent ? Math.max(1, Math.floor((total * rank) / 100)) : rank;

  return stats.kth(bottom ? Math.min(count, total) - 1 : Math.max(total - count, 0));
};

const ranked = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.Top }>,
  probe: Probe,
) => {
  const number = numberOf(probe.value);

  const cutoff =
    number === undefined
      ? undefined
      : topCutoff(probe.stats(), rule.rank, rule.percent, rule.bottom);

  if (number === undefined || cutoff === undefined) {
    return false;
  }
  return rule.bottom ? number <= cutoff : number >= cutoff;
};

const averaged = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.AboveAverage }>,
  probe: Probe,
) => {
  const number = numberOf(probe.value);
  const stats = probe.stats();
  const line = stats.mean() + (rule.below ? -1 : 1) * rule.deviations * stats.deviation();

  if (number === undefined) {
    return false;
  }
  if (rule.equal && number === line) {
    return true;
  }
  return rule.below ? number < line : number > line;
};

const textOf = (value: CellValue): string | undefined => {
  switch (value.kind) {
    case CellValueKind.String:
      return value.value.toLowerCase();
    case CellValueKind.Number:
      return String(value.value);
    case CellValueKind.Boolean:
      return value.value ? 'true' : 'false';
    default:
      return undefined;
  }
};

const texted = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.Text }>,
  probe: Probe,
) => {
  const text = textOf(probe.value) ?? '';
  const wanted = rule.text.toLowerCase();

  switch (rule.operator) {
    case TextOperator.Contains:
      return text.includes(wanted);
    case TextOperator.NotContains:
      return !text.includes(wanted);
    case TextOperator.BeginsWith:
      return text.startsWith(wanted);
    case TextOperator.EndsWith:
      return text.endsWith(wanted);
  }
};

const sundayIndex = (serial: number): number => (mondayIndex(serial) + 1) % 7;

const monthOf = (serial: number): number => {
  const civil = civilOf(serial);

  return civil.year * 12 + civil.month;
};

const PERIODS: Readonly<Record<TimePeriod, (day: number, today: number) => boolean>> = {
  today: (day, today) => day === today,
  yesterday: (day, today) => day === today - 1,
  tomorrow: (day, today) => day === today + 1,
  last7Days: (day, today) => day > today - 7 && day <= today,
  thisWeek: (day, today) => day - sundayIndex(day) === today - sundayIndex(today),
  lastWeek: (day, today) => day - sundayIndex(day) === today - sundayIndex(today) - 7,
  nextWeek: (day, today) => day - sundayIndex(day) === today - sundayIndex(today) + 7,
  thisMonth: (day, today) => monthOf(day) === monthOf(today),
  lastMonth: (day, today) => monthOf(day) === monthOf(today) - 1,
  nextMonth: (day, today) => monthOf(day) === monthOf(today) + 1,
};

const dated = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.TimePeriod }>,
  probe: Probe,
) => {
  const number = numberOf(probe.value);

  return number !== undefined && PERIODS[rule.period](Math.floor(number), probe.today());
};

const blank = (value: CellValue): boolean =>
  value.kind === CellValueKind.Empty ||
  (value.kind === CellValueKind.String && value.value.trim() === '');

const countOf = (probe: Probe): number => {
  const key = lookupKey(probe.value);

  return key === undefined ? 0 : probe.stats().countOf(key);
};

const VALUE_TESTS: Readonly<Record<ValueTest, (probe: Probe) => boolean>> = {
  duplicates: (probe) => countOf(probe) > 1,
  uniques: (probe) => countOf(probe) === 1,
  blanks: (probe) => blank(probe.value),
  filled: (probe) => !blank(probe.value),
  errors: (probe) => probe.value.kind === CellValueKind.Error,
  noErrors: (probe) => probe.value.kind !== CellValueKind.Error,
};

const matches = (rule: StyledRule, probe: Probe): boolean => {
  switch (rule.kind) {
    case ConditionalRuleKind.CellIs:
      return cellIs(rule, probe);
    case ConditionalRuleKind.Expression:
      return truthy(probe.evaluate(rule.formula));
    case ConditionalRuleKind.Top:
      return ranked(rule, probe);
    case ConditionalRuleKind.AboveAverage:
      return averaged(rule, probe);
    case ConditionalRuleKind.Text:
      return texted(rule, probe);
    case ConditionalRuleKind.TimePeriod:
      return dated(rule, probe);
    default:
      return VALUE_TESTS[rule.kind](probe);
  }
};

const fraction = (value: number, low: number, high: number): number =>
  high === low ? 1 : Math.min(Math.max((value - low) / (high - low), 0), 1);

const scaled = (stops: readonly ScaleStop[], probe: Probe): ConditionalLook | undefined => {
  const number = numberOf(probe.value);
  const points = stops.map((stop) => probe.threshold(stop.threshold));
  const segment = points.length > 2 && number !== undefined && number > (points[1] ?? 0) ? 1 : 0;
  const from = stops[segment];
  const to = stops[segment + 1];
  const low = points[segment];
  const high = points[segment + 1];

  if (number === undefined || !from || !to || low === undefined || high === undefined) {
    return undefined;
  }
  return { scale: { from: from.color, to: to.color, amount: fraction(number, low, high) } };
};

const barred = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.DataBar }>,
  probe: Probe,
) => {
  const number = numberOf(probe.value);
  const low = probe.threshold(rule.min);
  const high = probe.threshold(rule.max);

  if (number === undefined || low === undefined || high === undefined) {
    return undefined;
  }
  return {
    bar: { length: MIN_BAR + (MAX_BAR - MIN_BAR) * fraction(number, low, high), color: rule.color },
    hideValue: !rule.showValue,
  };
};

const ICON_COUNT = /^(\d)/u;

const iconed = (
  rule: Extract<ConditionalRule, { readonly kind: typeof ConditionalRuleKind.IconSet }>,
  probe: Probe,
) => {
  const number = numberOf(probe.value);
  const count = Number(ICON_COUNT.exec(rule.set)?.[1] ?? '3');
  const points = rule.thresholds.map(probe.threshold);

  if (number === undefined) {
    return undefined;
  }

  const reached = points.reduce<number>(
    (index, point, at) => (point !== undefined && number >= point ? at : index),
    0,
  );

  return {
    icon: { set: rule.set, index: rule.reverse ? count - 1 - reached : reached },
    hideValue: !rule.showValue,
  };
};

const outcomeOf = (rule: ConditionalRule, probe: Probe): ConditionalLook | undefined => {
  switch (rule.kind) {
    case ConditionalRuleKind.ColorScale:
      return scaled(rule.stops, probe);
    case ConditionalRuleKind.DataBar:
      return barred(rule, probe);
    case ConditionalRuleKind.IconSet:
      return iconed(rule, probe);
    case ConditionalRuleKind.Foreign:
      return undefined;
    default:
      return matches(rule, probe) ? { style: rule.style } : undefined;
  }
};

const mergedStyle = (
  first: DifferentialStyle | undefined,
  next: DifferentialStyle | undefined,
): DifferentialStyle | undefined =>
  first === undefined || next === undefined
    ? (first ?? next)
    : {
        font: first.font ?? next.font,
        fill: first.fill ?? next.fill,
        border: first.border ?? next.border,
        format: first.format ?? next.format,
      };

const unfilled = (style: DifferentialStyle | undefined): DifferentialStyle | undefined =>
  style?.fill === undefined ? style : { ...style, fill: undefined };

const merged = (look: Mutable<ConditionalLook>, next: ConditionalLook): void => {
  look.scale ??= look.style?.fill === undefined ? next.scale : undefined;

  look.style = mergedStyle(
    look.style,
    look.scale === undefined ? next.style : unfilled(next.style),
  );

  look.bar ??= next.bar;
  look.icon ??= next.icon;
  look.hideValue ??= next.hideValue;
};

const anchorOf = (format: ConditionalFormat): CellAddress => ({
  row: format.ranges[0]?.top ?? 0,
  col: format.ranges[0]?.left ?? 0,
});

const thresholdOf = (
  threshold: Threshold,
  stats: () => RangeStats,
  evaluate: (ast: FormulaNode) => CellValue,
): number | undefined => {
  const low = stats().low();
  const high = stats().high();

  switch (threshold.kind) {
    case ThresholdKind.Min:
      return low;
    case ThresholdKind.Max:
      return high;
    case ThresholdKind.AutoMin:
      return Math.min(0, low ?? 0);
    case ThresholdKind.AutoMax:
      return Math.max(0, high ?? 0);
    case ThresholdKind.Percent: {
      const share = numberOf(evaluate(threshold.value)) ?? 0;

      return low === undefined || high === undefined
        ? undefined
        : low + ((high - low) * share) / 100;
    }
    case ThresholdKind.Percentile:
      return percentileOf(stats(), (numberOf(evaluate(threshold.value)) ?? 0) / 100);
    default:
      return numberOf(evaluate(threshold.value));
  }
};

const ordered = (sheet: Sheet): Placed[] =>
  sheet.conditional
    .flatMap((format) => format.rules.map((entry) => ({ format, entry })))
    .toSorted((left, right) => left.entry.priority - right.entry.priority);

const overlap = (left: CellRange, right: CellRange): CellRange | undefined => {
  const top = Math.max(left.top, right.top);
  const bottom = Math.min(left.bottom, right.bottom);
  const leftEdge = Math.max(left.left, right.left);
  const rightEdge = Math.min(left.right, right.right);

  return top > bottom || leftEdge > rightEdge
    ? undefined
    : { top, bottom, left: leftEdge, right: rightEdge };
};

const cellsOf = (area: CellRange, visit: (row: number, col: number) => void): void => {
  for (let row = area.top; row <= area.bottom; row += 1) {
    for (let col = area.left; col <= area.right; col += 1) {
      visit(row, col);
    }
  }
};

export const createConditionalPainter = (calculator: Calculator): ConditionalPainter => {
  const cache = new WeakMap<ConditionalFormat, RangeStats>();

  const statsFor = (sheet: Sheet, format: ConditionalFormat): RangeStats => {
    const known = cache.get(format) ?? createRangeStats(sheet, format.ranges);

    cache.set(format, known);
    return known;
  };

  const looks = (sheet: Sheet, range: CellRange): ReadonlyMap<number, ConditionalLook> => {
    const found = new Map<number, Mutable<ConditionalLook>>();
    const stopped = new Set<number>();
    let today: number | undefined;

    const todayAt = (anchor: CellAddress): number => {
      today ??= Math.floor(
        numberOf(calculator.evaluateAt(sheet, anchor.row, anchor.col, TODAY)) ?? 0,
      );

      return today;
    };

    const paint = ({ format, entry }: Placed): void => {
      const anchor = anchorOf(format);
      const stats = (): RangeStats => statsFor(sheet, format);

      const atAnchor = (ast: FormulaNode): CellValue =>
        calculator.evaluateAt(sheet, anchor.row, anchor.col, ast);

      const probeAt = (row: number, col: number): Probe => ({
        value: sheet.cells.get(row, col),
        format,
        evaluate: (ast) => calculator.evaluateAt(sheet, row, col, ast),
        threshold: (threshold) => thresholdOf(threshold, stats, atAnchor),
        stats,
        today: () => todayAt(anchor),
      });

      const visit = (row: number, col: number): void => {
        const key = row * MAX_COLS + col;
        const outcome = stopped.has(key) ? undefined : outcomeOf(entry.rule, probeAt(row, col));

        if (outcome === undefined) {
          return;
        }

        const look = found.get(key) ?? {};

        merged(look, outcome);
        found.set(key, look);
        if (entry.stopIfTrue) {
          stopped.add(key);
        }
      };

      format.ranges.forEach((target) => {
        const area = overlap(target, range);

        if (area !== undefined) {
          cellsOf(area, visit);
        }
      });
    };

    ordered(sheet).forEach(paint);
    return found;
  };

  return { looks };
};
