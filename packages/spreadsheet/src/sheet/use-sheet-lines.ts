import type { NuiMenuEntry } from '@numior/vue';
import { LineAxis, MAX_COLS, MAX_ROWS, StepKind, type CellRange } from '../core';
import type { NuiSpreadsheetSelection, SheetLines, SheetLinesOptions } from './sheet.types';

interface LineSpan {
  readonly first: number;
  readonly last: number;
}

const spanOf = (selection: NuiSpreadsheetSelection, rows: boolean): LineSpan =>
  selection.ranges.reduce(
    (span: LineSpan, range: CellRange) => ({
      first: Math.min(span.first, rows ? range.top : range.left),
      last: Math.max(span.last, rows ? range.bottom : range.right),
    }),
    { first: Number.POSITIVE_INFINITY, last: Number.NEGATIVE_INFINITY },
  );

const whole = (span: LineSpan, rows: boolean): boolean =>
  span.first === 0 && span.last === (rows ? MAX_ROWS : MAX_COLS) - 1;

export const useSheetLines = (options: SheetLinesOptions): SheetLines => {
  const change = (
    kind: typeof StepKind.InsertLines | typeof StepKind.DeleteLines,
    axis: LineAxis,
    at: number,
    count: number,
  ): void => {
    const sheet = options.sheet();

    if (
      sheet !== undefined &&
      !options.editing.apply([{ kind, sheet: sheet.name, axis, at, count }])
    ) {
      options.announce(options.messages.value.sheetFull);
    }
  };

  const lineItems = (selection: NuiSpreadsheetSelection, axis: LineAxis): NuiMenuEntry[] => {
    const rows = axis === LineAxis.Rows;
    const span = spanOf(selection, rows);
    const count = span.last - span.first + 1;
    const texts = options.messages.value;

    if (whole(span, rows)) {
      return [];
    }
    return [
      {
        key: `${axis}-before`,
        label: rows ? texts.insertRowsAbove({ count }) : texts.insertColsBefore({ count }),
        onSelect: () => change(StepKind.InsertLines, axis, span.first, count),
      },
      {
        key: `${axis}-after`,
        label: rows ? texts.insertRowsBelow({ count }) : texts.insertColsAfter({ count }),
        onSelect: () => change(StepKind.InsertLines, axis, span.last + 1, count),
      },
      {
        key: `${axis}-delete`,
        label: rows ? texts.deleteRows({ count }) : texts.deleteCols({ count }),
        tone: 'error',
        onSelect: () => change(StepKind.DeleteLines, axis, span.first, count),
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

    return [rows, cols, [...options.tools()], extra].reduce<NuiMenuEntry[]>(
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
