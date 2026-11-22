import { computed, type ComputedRef, type Ref } from 'vue';
import { createIntent } from '@numior/primitives';
import { TableNodeKind } from '../../engine';
import { useTableRowDrag, type TableRowDrag } from '../use-table-row-drag';
import { useTableRowResize, type TableRowResize } from '../use-table-row-resize';
import type { TableSelectionKey } from '../use-table-selection';
import type { NuiTableCellPosition, NuiTableRowHeights, TableBodyRow } from '../table.types';
import type { TableContext } from './table-context';

export interface RowMovesAreaOptions<T> {
  readonly draggable: () => boolean;
  readonly queried: () => boolean;
  readonly sizable: () => boolean;
  readonly heights: Ref<NuiTableRowHeights>;
  readonly nestDelay: () => number;
  readonly canNest: (row: T) => boolean;
  readonly childCount: (row: T) => number;
  readonly keyOf: (row: T) => TableSelectionKey<T>;
  readonly labelOf: (row: T) => string;
  readonly labelAt: (position: number) => string;
  readonly selectRow: (position: number) => void;
  readonly focusCell: (visual: NuiTableCellPosition) => void;
}

export interface RowMovesArea {
  readonly dragEnabled: ComputedRef<boolean>;
  readonly rowDrag: TableRowDrag;
  readonly rowResize: TableRowResize;
  readonly sizableOf: (item: TableBodyRow) => boolean;
  readonly grabAt: (position: number | undefined, event: PointerEvent) => void;
  readonly onRowResize: (key: string, event: PointerEvent, position: number | undefined) => void;
  readonly onRowResetSize: (key: string, position: number | undefined) => void;
  readonly refocusMoved: () => void;
}

export const useRowMovesArea = <T>(
  table: TableContext<T>,
  own: RowMovesAreaOptions<T>,
): RowMovesArea => {
  const movedRow = createIntent<T>();

  const dragEnabled = computed(() => own.draggable() && !table.loading() && !own.queried());

  const rowResize = useTableRowResize({
    enabled: () => own.sizable() && !table.loading(),
    heights: own.heights,
    rowSize: table.rowSize,
    keyAt: (position) => {
      const node = table.engine.value.nodeAt(table.pageStart() + position);
      return node?.kind === TableNodeKind.Row ? String(node.id) : undefined;
    },
    labelAt: own.labelAt,
    messages: table.messages,
    announce: table.announce,
    resized: (changes) => {
      table.emit('rowResize', changes);
    },
    tapped: own.selectRow,
  });

  const positionOf = (row: T): number | undefined => {
    const key = own.keyOf(row);
    const engine = table.engine.value;
    const count = engine.count();

    for (let index = table.pageStart(); index < count; index += 1) {
      const node = engine.nodeAt(index);

      if (node?.kind === TableNodeKind.Row && own.keyOf(node.row) === key) {
        return index - table.pageStart();
      }
    }
    return undefined;
  };

  const refocusMoved = (): void => {
    const row = movedRow.take();
    const position = row === undefined ? undefined : positionOf(row);

    if (position === undefined) {
      return;
    }

    own.focusCell({ row: position + table.pinnedRows(), col: table.active().col });
  };

  const rowDrag = useTableRowDrag<T>({
    enabled: () => dragEnabled.value,
    engine: table.engine,
    viewport: () => table.viewport.value,
    frame: () => table.frame.value,
    pageStart: table.pageStart,
    rowCount: table.bodyRows,
    rowSize: table.rowSize,
    leading: () => table.headRows() + table.pinnedRows(),
    nestDelay: own.nestDelay,
    isRtl: table.isRtl,
    canNest: own.canNest,
    childCount: own.childCount,
    labelOf: own.labelOf,
    messages: table.messages,
    announce: table.announce,
    refocus: (row) => {
      movedRow.set(row);
    },
    emit: (event) => {
      table.emit('reorder', event);
    },
  });

  const sizableOf = (item: TableBodyRow): boolean => own.sizable() && item.group === undefined;

  const grabAt = (position: number | undefined, event: PointerEvent): void => {
    if (position === undefined) {
      return;
    }

    rowDrag.grab(position, event);
  };

  const onRowResize = (_key: string, event: PointerEvent, position: number | undefined): void => {
    if (position === undefined) {
      return;
    }

    rowResize.start(position, event);
  };

  const onRowResetSize = (_key: string, position: number | undefined): void => {
    if (position === undefined) {
      return;
    }

    rowResize.reset(position);
  };

  return {
    dragEnabled,
    rowDrag,
    rowResize,
    sizableOf,
    grabAt,
    onRowResize,
    onRowResetSize,
    refocusMoved,
  };
};
