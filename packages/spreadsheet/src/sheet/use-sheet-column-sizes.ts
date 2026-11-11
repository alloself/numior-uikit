import type { NuiTableColumnResize, NuiTableWidths } from '@numior/table';
import { shallowRef, type ShallowRef } from 'vue';
import { columnIndex, withLineSizes, type Sheet } from '../core';
import { pixelsToChars } from './sheet-cells';
import { layoutStepOf } from './sheet-layout-step';
import type { SheetCells, SheetEditing } from './sheet.types';

export interface SheetColumnSizesOptions {
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly readonly: () => boolean;
  readonly editing: Pick<SheetEditing, 'apply'>;
}

export interface SheetColumnSizes {
  readonly widths: ShallowRef<NuiTableWidths>;
  commit(changes: readonly NuiTableColumnResize[]): void;
  forget(): void;
}

const NO_WIDTHS: NuiTableWidths = {};

const sizesOf = (
  cells: SheetCells,
  changes: readonly NuiTableColumnResize[],
): Map<number, number | undefined> =>
  changes.reduce((sizes, change) => {
    const position = columnIndex(change.key);

    if (position !== undefined) {
      sizes.set(
        cells.colAt(position),
        change.width === undefined ? undefined : pixelsToChars(change.width),
      );
    }
    return sizes;
  }, new Map<number, number | undefined>());

export const useSheetColumnSizes = (options: SheetColumnSizesOptions): SheetColumnSizes => {
  const widths = shallowRef<NuiTableWidths>(NO_WIDTHS);

  const forget = (): void => {
    widths.value = NO_WIDTHS;
  };

  const commit = (changes: readonly NuiTableColumnResize[]): void => {
    const sheet = options.sheet();
    const cells = options.cells();

    if (sheet === undefined || cells === undefined || options.readonly()) {
      return;
    }

    const cols = withLineSizes(sheet.layout.cols, sizesOf(cells, changes));
    const step = layoutStepOf(sheet, { ...sheet.layout, cols });

    if (step !== undefined && !options.editing.apply([step])) {
      return;
    }

    forget();
  };

  return { widths, commit, forget };
};
