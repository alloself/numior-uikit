import {
  clipboardDataOf,
  type NuiTableClipboardData,
  type NuiTableClipboardScope,
  type NuiTablePasteScope,
  type NuiTableRange,
  type NuiTableRanges,
} from '@numior/table';
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

const spanOf = (from: number, to: number): number[] =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => Math.min(from, to) + index);

const areaOf = (ranges: NuiTableRanges): number =>
  ranges.reduce(
    (total, range) =>
      total +
      (Math.abs(range.to.row - range.from.row) + 1) * (Math.abs(range.to.col - range.from.col) + 1),
    0,
  );

const textLines = (cells: SheetCells, range: NuiTableRange): string[][] =>
  spanOf(range.from.row, range.to.row).map((row) =>
    spanOf(range.from.col, range.to.col).map((col) => cells.source.cellAt(row, col)?.text ?? ''),
  );

const headerOf = (cells: SheetCells, range: NuiTableRange): string[] =>
  spanOf(range.from.col, range.to.col).map((col) => columnName(cells.colAt(col)));

export const useSheetClipboard = (options: SheetClipboardOptions): SheetClipboard => {
  const mark = shallowRef<SheetClipMark>();

  const clips = computed(() => createCellClips(options.book(), options.calculator()));

  const live = (): SheetClipMark | undefined => {
    const current = mark.value;

    return current !== undefined && current.revision === options.editing.revision.value
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
      : { clip, text, sheet, range, revision: options.editing.revision.value, cut: false };
  };

  const serialize = (scope: NuiTableClipboardScope<number>): NuiTableClipboardData => {
    const cells = options.cells();
    const first = scope.ranges[0];

    if (cells === undefined || first === undefined) {
      return { text: '' };
    }

    const lines = scope.ranges.flatMap((range) => textLines(cells, range));
    const data = clipboardDataOf(lines, scope.headers ? headerOf(cells, first) : undefined);

    mark.value = remember(scope, cells, data.text);
    return data;
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

    const result = data.text === current.text ? placed(current, lineRange(cells, last)) : undefined;

    if (result === undefined || !options.editing.apply([result.step])) {
      return undefined;
    }

    mark.value = current.cut ? undefined : { ...current, revision: options.editing.revision.value };
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
