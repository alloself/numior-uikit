import type {
  NuiTableColumnResize,
  NuiTableRanges,
  NuiTableRowHeights,
  NuiTableRowResize,
  NuiTableWidths,
} from '@numior/table';
import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import { LineAxis, columnIndex, withLineSizes, type LineLayouts, type SheetLayout } from '../core';
import { pixelsToChars, pixelsToPoints } from './sheet-cells';
import { layoutStepOf } from './sheet-layout-step';
import {
  NuiSpreadsheetRefusalReason,
  type SheetCells,
  type SheetLineSizesOptions,
} from './sheet.types';

export interface SheetLineSizes {
  readonly widths: ShallowRef<NuiTableWidths>;
  readonly heights: ComputedRef<NuiTableRowHeights>;
  setHeights(next: NuiTableRowHeights): void;
  commitWidths(changes: readonly NuiTableColumnResize[]): void;
  commitHeights(changes: readonly NuiTableRowResize[]): void;
  forget(): void;
}

interface LineSpan {
  readonly first: number;
  readonly last: number;
}

interface LineSize {
  readonly position: number;
  readonly size: number | undefined;
}

interface AxisPlace {
  readonly axis: LineAxis;
  readonly count: number;
  readonly across: number;
  readonly lineAt: (position: number) => number;
}

const LINES_AT_ONCE = 20_000;

const NO_WIDTHS: NuiTableWidths = {};

const NO_HEIGHTS: NuiTableRowHeights = {};

const placeOf = (cells: SheetCells, axis: LineAxis): AxisPlace =>
  axis === LineAxis.Rows
    ? { axis, count: cells.source.rows, across: cells.source.cols, lineAt: cells.rowAt }
    : { axis, count: cells.source.cols, across: cells.source.rows, lineAt: cells.colAt };

const wholeSpans = (ranges: NuiTableRanges, place: AxisPlace): LineSpan[] =>
  ranges.reduce<LineSpan[]>((spans, { from, to }) => {
    const rows = place.axis === LineAxis.Rows;
    const along = rows ? [from.row, to.row] : [from.col, to.col];
    const other = rows ? [from.col, to.col] : [from.row, to.row];
    const [start = 0, end = 0] = along.toSorted((a, b) => a - b);
    const [low = 0, high = 0] = other.toSorted((a, b) => a - b);

    if (low === 0 && high === place.across - 1) {
      spans.push({ first: start, last: end });
    }
    return spans;
  }, []);

const holds = (span: LineSpan, position: number): boolean =>
  position >= span.first && position <= span.last;

const spansFor = (selected: readonly LineSpan[], position: number): readonly LineSpan[] =>
  selected.some((span) => holds(span, position)) ? selected : [{ first: position, last: position }];

const coversAxis = (spans: readonly LineSpan[], place: AxisPlace): boolean =>
  spans.some((span) => span.first === 0 && span.last === place.count - 1);

const spreadSizes = (
  place: AxisPlace,
  spans: readonly LineSpan[],
  size: number | undefined,
): Map<number, number | undefined> => {
  const sizes = new Map<number, number | undefined>();

  for (const span of spans) {
    for (let position = span.first; position <= span.last; position += 1) {
      sizes.set(place.lineAt(position), size);
    }
  }
  return sizes;
};

const ownSizes = (
  place: AxisPlace,
  changes: readonly LineSize[],
): Map<number, number | undefined> =>
  new Map(changes.map((change) => [place.lineAt(change.position), change.size]));

const unsized = (lines: LineLayouts): Map<number, undefined> => {
  const sizes = new Map<number, undefined>();

  lines.forEach((line, layout) => {
    if (layout.size === undefined) {
      return;
    }

    sizes.set(line, undefined);
  });

  return sizes;
};

const withDefault = (
  layout: SheetLayout,
  axis: LineAxis,
  size: number | undefined,
): SheetLayout => ({
  ...layout,
  [axis]: withLineSizes(layout[axis], unsized(layout[axis])),
  defaults:
    axis === LineAxis.Rows
      ? { ...layout.defaults, rowHeight: size }
      : { ...layout.defaults, colWidth: size },
});

const linesIn = (spans: readonly LineSpan[]): number =>
  spans.reduce((total, span) => total + span.last - span.first + 1, 0);

const spansOf = (selected: readonly LineSpan[], changes: readonly LineSize[]): LineSpan[] => {
  const [only, ...rest] = changes;

  return only === undefined || rest.length > 0
    ? changes.map((change) => ({ first: change.position, last: change.position }))
    : [...spansFor(selected, only.position)];
};

const sizedLayout = (
  layout: SheetLayout,
  place: AxisPlace,
  spans: readonly LineSpan[],
  changes: readonly LineSize[],
): SheetLayout => {
  const [only, ...rest] = changes;

  if (only === undefined || rest.length > 0) {
    return { ...layout, [place.axis]: withLineSizes(layout[place.axis], ownSizes(place, changes)) };
  }
  return coversAxis(spans, place)
    ? withDefault(layout, place.axis, only.size)
    : {
        ...layout,
        [place.axis]: withLineSizes(layout[place.axis], spreadSizes(place, spans, only.size)),
      };
};

const widthChanges = (changes: readonly NuiTableColumnResize[]): LineSize[] =>
  changes.reduce<LineSize[]>((sizes, change) => {
    const position = columnIndex(change.key);

    if (position !== undefined) {
      sizes.push({
        position,
        size: change.width === undefined ? undefined : pixelsToChars(change.width),
      });
    }
    return sizes;
  }, []);

const heightChanges = (changes: readonly NuiTableRowResize[]): LineSize[] =>
  changes.map((change) => ({
    position: Number(change.key),
    size: change.height === undefined ? undefined : pixelsToPoints(change.height),
  }));

export const useSheetLineSizes = (options: SheetLineSizesOptions): SheetLineSizes => {
  const widths = shallowRef<NuiTableWidths>(NO_WIDTHS);
  const draft = shallowRef<NuiTableRowHeights>();
  const heights = computed(() => draft.value ?? options.cells()?.rowHeights ?? NO_HEIGHTS);

  const forget = (): void => {
    widths.value = NO_WIDTHS;
    draft.value = undefined;
  };

  const commit = (axis: LineAxis, changes: readonly LineSize[]): void => {
    const sheet = options.sheet();
    const cells = options.cells();

    if (sheet === undefined || cells === undefined || options.readonly()) {
      return;
    }

    const place = placeOf(cells, axis);
    const spans = spansOf(wholeSpans(options.ranges(), place), changes);

    if (!coversAxis(spans, place) && linesIn(spans) > LINES_AT_ONCE) {
      options.refuse(
        NuiSpreadsheetRefusalReason.LinesTooMany,
        options.messages.value.linesTooMany({ limit: LINES_AT_ONCE }),
      );

      forget();
      return;
    }

    const step = layoutStepOf(sheet, sizedLayout(sheet.layout, place, spans, changes));

    if (step !== undefined && !options.editing.apply([step])) {
      return;
    }

    forget();
  };

  return {
    widths,
    heights,
    setHeights: (next) => {
      draft.value = next;
    },
    commitWidths: (changes) => {
      commit(LineAxis.Cols, widthChanges(changes));
    },
    commitHeights: (changes) => {
      commit(LineAxis.Rows, heightChanges(changes));
    },
    forget,
  };
};
