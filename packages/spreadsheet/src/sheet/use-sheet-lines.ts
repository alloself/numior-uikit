import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
} from '@lucide/vue';
import type { NuiMenuEntry } from '@numior/vue';
import { markRaw } from 'vue';
import {
  LineAxis,
  MAX_COLS,
  MAX_ROWS,
  StepKind,
  StepRefusal,
  type CellRange,
  type WorkbookStep,
} from '../core';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';
import type { NuiSpreadsheetSelection, SheetLines, SheetLinesOptions } from './sheet.types';

interface LineSpan {
  readonly first: number;
  readonly last: number;
}

const ROW_ABOVE = markRaw(BetweenHorizontalStart);

const ROW_BELOW = markRaw(BetweenHorizontalEnd);

const COL_BEFORE = markRaw(BetweenVerticalStart);

const COL_AFTER = markRaw(BetweenVerticalEnd);

const spanOf = (range: CellRange, rows: boolean): LineSpan =>
  rows ? { first: range.top, last: range.bottom } : { first: range.left, last: range.right };

const groupsOf = (selection: NuiSpreadsheetSelection, rows: boolean): LineSpan[] =>
  selection.ranges
    .map((range) => spanOf(range, rows))
    .toSorted((a, b) => a.first - b.first)
    .reduce<LineSpan[]>((groups, span) => {
      const last = groups.at(-1);

      return last !== undefined && span.first <= last.last + 1
        ? [...groups.slice(0, -1), { first: last.first, last: Math.max(last.last, span.last) }]
        : [...groups, span];
    }, []);

const sizeOf = (span: LineSpan): number => span.last - span.first + 1;

const whole = (span: LineSpan, rows: boolean): boolean =>
  span.first === 0 && span.last === (rows ? MAX_ROWS : MAX_COLS) - 1;

const refusalText = (refusal: StepRefusal, texts: NuiSpreadsheetMessages): string => {
  switch (refusal) {
    case StepRefusal.SheetFull:
      return texts.sheetFull;
    case StepRefusal.PivotOverlap:
      return texts.linesCrossPivot;
    default:
      return texts.linesRefused;
  }
};

export const useSheetLines = (options: SheetLinesOptions): SheetLines => {
  const change = (
    kind: typeof StepKind.InsertLines | typeof StepKind.DeleteLines,
    axis: LineAxis,
    places: readonly LineSpan[],
    after = false,
  ): void => {
    const sheet = options.sheet();

    if (sheet === undefined) {
      return;
    }

    const steps = places.toReversed().map((span): WorkbookStep => ({
      kind,
      sheet: sheet.name,
      axis,
      at: after ? span.last + 1 : span.first,
      count: sizeOf(span),
    }));

    options.editing.apply(steps, (refusal) => refusalText(refusal, options.messages.value));
  };

  const lineItems = (selection: NuiSpreadsheetSelection, axis: LineAxis): NuiMenuEntry[] => {
    const rows = axis === LineAxis.Rows;
    const groups = groupsOf(selection, rows);
    const count = groups.reduce((total, span) => total + sizeOf(span), 0);
    const texts = options.messages.value;

    if (groups.some((span) => whole(span, rows))) {
      return [];
    }
    return [
      {
        key: `${axis}-before`,
        label: rows ? texts.insertRowsAbove({ count }) : texts.insertColsBefore({ count }),
        icon: rows ? ROW_ABOVE : COL_BEFORE,
        onSelect: () => change(StepKind.InsertLines, axis, groups),
      },
      {
        key: `${axis}-after`,
        label: rows ? texts.insertRowsBelow({ count }) : texts.insertColsAfter({ count }),
        icon: rows ? ROW_BELOW : COL_AFTER,
        onSelect: () => change(StepKind.InsertLines, axis, groups, true),
      },
      {
        key: `${axis}-delete`,
        label: rows ? texts.deleteRows({ count }) : texts.deleteCols({ count }),
        icon: 'trash',
        tone: 'error',
        onSelect: () => change(StepKind.DeleteLines, axis, groups),
      },
    ];
  };

  const menu = (): readonly NuiMenuEntry[] => {
    const sheet = options.sheet();
    const selection = options.selection.current.value;

    if (sheet === undefined || selection === undefined || options.readonly()) {
      return [];
    }

    const rows = lineItems(selection, LineAxis.Rows);
    const cols = lineItems(selection, LineAxis.Cols);
    const extra = [...(options.extra()?.({ sheet, selection }) ?? [])];

    return [rows, cols, [...options.cells()], [...options.tools()], extra].reduce<NuiMenuEntry[]>(
      (entries, group, index) => {
        if (group.length === 0) {
          return entries;
        }

        return entries.length === 0
          ? [...group]
          : [...entries, { type: 'separator', key: `group-${String(index)}` }, ...group];
      },
      [],
    );
  };

  return { menu };
};
