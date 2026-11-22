import { TableNodeKind } from '../../engine';
import { useTableOverlay, type TableOverlay } from '../use-table-overlay';
import type { NuiTableCellKey, NuiTableCellPosition, NuiTableRange } from '../table.types';
import type { TableContext } from './table-context';

export interface OverlayAreaOptions {
  readonly headSize: () => number;
  readonly expand: (range: NuiTableRange) => NuiTableRange;
}

export interface OverlayArea {
  readonly overlay: TableOverlay;
  readonly cellKeyOf: (position: NuiTableCellPosition) => NuiTableCellKey | undefined;
  readonly cellPositionOf: (key: NuiTableCellKey) => NuiTableCellPosition | undefined;
}

export const useOverlayArea = <T>(table: TableContext<T>, own: OverlayAreaOptions): OverlayArea => {
  const overlay = useTableOverlay({
    viewport: table.viewport,
    rows: table.rowWindow(),
    columns: table.columnWindow(),
    layout: table.layout,
    dataKeys: table.dataKeys,
    rowCount: table.bodyRows,
    headSize: own.headSize,
    headRows: table.headRows,
    pinnedRows: table.pinnedRows,
    frozenRows: table.frozenRows,
    dataOffset: table.dataOffset,
    expand: own.expand,
    onWindow: (next) => {
      table.emit('window', next);
    },
  });

  const cellKeyOf = (position: NuiTableCellPosition): NuiTableCellKey | undefined => {
    const node = table.revision.read(() =>
      table.engine.value.nodeAt(table.pageStart() + position.row),
    );

    const column = table.dataKeys()[position.col];

    return node?.kind !== TableNodeKind.Row || column === undefined
      ? undefined
      : { row: node.id, column };
  };

  const cellPositionOf = (key: NuiTableCellKey): NuiTableCellPosition | undefined => {
    const col = table.dataKeys().indexOf(key.column);

    const [found] =
      col < 0
        ? []
        : table.revision.read(() =>
            table.engine.value.positionsOf((rowId) => rowId === key.row, 1),
          );

    const row = found === undefined ? -1 : found[1] - table.pageStart();

    return row < 0 || row >= table.bodyRows() ? undefined : { row, col };
  };

  return { overlay, cellKeyOf, cellPositionOf };
};
