import { dataKeyAt } from '../table-layout';
import {
  useTableClipboard,
  type TableClipboard,
  type TableClipboardOptions,
  type TableCopyCell,
} from '../use-table-clipboard';
import { useTableExport, type TableExport } from '../use-table-export';
import type { NuiTableCellPosition } from '../table.types';
import type { TableContext } from './table-context';

export interface ClipboardAreaOptions<T> {
  readonly position: () => NuiTableCellPosition | undefined;
  readonly serialize: TableClipboardOptions<T>['serialize'];
  readonly limit: () => number;
  readonly last: () => NuiTableCellPosition | undefined;
}

export interface ClipboardArea {
  readonly clipboard: TableClipboard;
  readonly exporter: TableExport;
}

export const useClipboardArea = <T>(
  table: TableContext<T>,
  own: ClipboardAreaOptions<T>,
): ClipboardArea => {
  const labelOf = (key: string): string => table.columnAt(key).label;

  const copyCell = (): TableCopyCell<T> | undefined => {
    const active = table.active();
    const row = table.rowFor(active.row);
    const key = dataKeyAt(table.layout(), active.col);

    return row === undefined || key === undefined ? undefined : { row, key };
  };

  const clipboard = useTableClipboard<T>({
    ranges: table.ranges,
    cell: copyCell,
    position: own.position,
    serialize: own.serialize,
    rowAt: table.rowAtPosition,
    keyAt: (col) => table.dataKeys()[col],
    labelOf,
    textOf: table.textOf,
    limit: own.limit,
    last: own.last,
    messages: table.messages,
    announce: table.announce,
  });

  const exporter = useTableExport<T>({
    rows: (signal) => table.engine.value.collect(signal),
    keys: table.dataKeys,
    labelOf,
    textOf: table.textOf,
    messages: table.messages,
    announce: table.announce,
  });

  return { clipboard, exporter };
};
