import {
  clipboardDataOf,
  type NuiTableClipboardData,
  type NuiTableClipboardScope,
  type NuiTablePasteScope,
  type NuiTableRanges,
} from '@numior/table';
import { yieldToHost } from '@numior/table/engine';
import { computed, shallowRef } from 'vue';
import { columnName, createCellClips, type CellRange, type ClipPaste } from '../core';
import type {
  SheetCells,
  SheetClipboard,
  SheetClipboardOptions,
  SheetClipFrame,
  SheetClipMark,
} from './sheet.types';
import { lineRange, tableRangeOf } from './use-sheet-selection';

const LINE_BREAKS = /\r\n?/g;

const SYNC_CELLS = 20_000;

const CHUNK_CELLS = 10_000;

const areaOf = (ranges: NuiTableRanges): number =>
  ranges.reduce(
    (total, range) =>
      total +
      (Math.abs(range.to.row - range.from.row) + 1) * (Math.abs(range.to.col - range.from.col) + 1),
    0,
  );

const textLines = (
  cells: SheetCells,
  rows: readonly number[],
  cols: readonly number[],
): string[][] => rows.map((row) => cols.map((col) => cells.textAt(row, col)));

const slicedLines = async (
  cells: SheetCells,
  rows: readonly number[],
  cols: readonly number[],
): Promise<string[][]> => {
  const step = Math.max(1, Math.floor(CHUNK_CELLS / Math.max(1, cols.length)));
  const lines: string[][] = [];

  for (let from = 0; from < rows.length; from += step) {
    for (const entry of textLines(cells, rows.slice(from, from + step), cols)) {
      lines.push(entry);
    }
    await yieldToHost();
  }
  return lines;
};

const headerOf = (cells: SheetCells, cols: readonly number[]): string[] =>
  cols.map((col) => columnName(cells.colAt(col)));

const sameText = (pasted: string, copied: string): boolean =>
  pasted.replaceAll(LINE_BREAKS, '\n') === copied.replaceAll(LINE_BREAKS, '\n');

export const useSheetClipboard = (options: SheetClipboardOptions): SheetClipboard => {
  const mark = shallowRef<SheetClipMark>();

  const clips = computed(() => createCellClips(options.book(), options.calculator()));

  const live = (): SheetClipMark | undefined => {
    const current = mark.value;

    return current !== undefined && current.revision === options.editing.revision.stamp
      ? current
      : undefined;
  };

  const remember = (
    scope: NuiTableClipboardScope<number>,
    cells: SheetCells,
    text: string,
  ): SheetClipMark | undefined => {
    const sheet = options.sheet();
    const first = scope.ranges[0];

    if (sheet === undefined || first === undefined || scope.ranges.length > 1 || scope.headers) {
      return undefined;
    }

    const range = lineRange(cells, first);
    const clip = clips.value.copy(sheet.name, range);

    return clip === undefined
      ? undefined
      : { clip, text, sheet, range, revision: options.editing.revision.stamp, cut: false };
  };

  const written = (
    scope: NuiTableClipboardScope<number>,
    cells: SheetCells,
    lines: readonly (readonly string[])[],
  ): NuiTableClipboardData => {
    const data = clipboardDataOf(lines, scope.headers ? headerOf(cells, scope.cols) : undefined);

    mark.value = remember(scope, cells, data.text);
    return data;
  };

  const serialize = (
    scope: NuiTableClipboardScope<number>,
  ): NuiTableClipboardData | Promise<NuiTableClipboardData> => {
    const cells = options.cells();

    if (cells === undefined || scope.rows.length === 0) {
      return { text: '' };
    }

    return scope.rows.length * scope.cols.length > SYNC_CELLS
      ? slicedLines(cells, scope.rows, scope.cols).then((lines) => written(scope, cells, lines))
      : written(scope, cells, textLines(cells, scope.rows, scope.cols));
  };

  const cut = (): boolean => {
    const current = live();

    if (current === undefined) {
      return false;
    }
    mark.value = { ...current, cut: true };
    return true;
  };

  const placed = (current: SheetClipMark, target: CellRange): ClipPaste | undefined => {
    const sheet = options.sheet();

    if (sheet === undefined) {
      return undefined;
    }

    return current.cut
      ? clips.value.move(sheet.name, current.clip, { row: target.top, col: target.left })
      : clips.value.paste(sheet.name, current.clip, target);
  };

  const paste = (
    data: NuiTableClipboardData,
    scope: NuiTablePasteScope,
  ): NuiTableRanges | undefined => {
    const current = live();
    const cells = options.cells();
    const last = scope.ranges.at(-1);

    if (current === undefined || cells === undefined || last === undefined) {
      return undefined;
    }

    const result = sameText(data.text, current.text)
      ? placed(current, lineRange(cells, last))
      : undefined;

    if (result === undefined || options.editing.attempt([result.step]) !== undefined) {
      return undefined;
    }

    mark.value = current.cut ? undefined : { ...current, revision: options.editing.revision.stamp };
    return [tableRangeOf(cells, result.area)];
  };

  const clear = (ranges: NuiTableRanges): number => {
    const sheet = options.sheet();
    const cells = options.cells();

    const step =
      sheet === undefined || cells === undefined
        ? undefined
        : clips.value.clear(
            sheet.name,
            ranges.map((range) => lineRange(cells, range)),
          );

    return step !== undefined && options.editing.apply([step]) ? areaOf(ranges) : 0;
  };

  const frames = computed((): readonly SheetClipFrame[] => {
    const current = live();
    const cells = options.cells();

    if (current === undefined || cells === undefined || current.sheet !== options.sheet()) {
      return [];
    }

    const range = tableRangeOf(cells, current.range);

    return [{ key: `${String(current.revision)}:${String(current.text.length)}`, range }];
  });

  const forget = (): void => {
    mark.value = undefined;
  };

  return {
    hooks: { serialize, paste, cut },
    commands: { ...options.editing.commands, clear },
    frames,
    forget,
  };
};
