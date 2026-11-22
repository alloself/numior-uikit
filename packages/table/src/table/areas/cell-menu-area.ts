import { useTemplateRef } from 'vue';
import type { NuiMenuExposed } from '@numior/vue';
import { dataKeyAt } from '../table-layout';
import { useTableContextMenu, type TableContextMenu } from '../use-table-context-menu';
import type { TableClipboard } from '../use-table-clipboard';
import type { TableEditing } from '../use-table-editing';
import type { TableRanges } from '../use-table-ranges';
import type {
  NuiTableCellPosition,
  NuiTableContextMenu,
  NuiTableContextScope,
  NuiTableRanges,
} from '../table.types';
import type { TableContext } from './table-context';

export interface CellMenuAreaOptions<T> {
  readonly option: () => NuiTableContextMenu<T> | false | undefined;
  readonly cellSelection: () => boolean;
  readonly editable: () => boolean;
  readonly clipboard: TableClipboard;
  readonly editing: TableEditing<T>;
  readonly ranges: TableRanges;
  readonly anchorOf: (visual: NuiTableCellPosition) => NuiTableCellPosition;
  readonly focusCell: (visual: NuiTableCellPosition) => void;
}

export const useCellMenuArea = <T>(
  table: TableContext<T>,
  own: CellMenuAreaOptions<T>,
): TableContextMenu => {
  const menuNode = useTemplateRef<NuiMenuExposed>('cell-menu');
  const anchor = useTemplateRef<HTMLElement>('context-anchor');

  const selectFor = (target: NuiTableCellPosition): NuiTableRanges => {
    const body = { row: target.row - table.pinnedRows(), col: target.col - table.dataOffset() };

    if (body.row >= 0 && own.ranges.contains(body)) {
      return table.ranges();
    }

    const active = table.active();

    const focused =
      active.row === target.row &&
      active.col === target.col &&
      table.viewport.value?.contains(document.activeElement) === true;

    own.ranges.clear();

    if (!focused) {
      own.focusCell(target);
    }
    return [];
  };

  const scopeFor = (
    focused: NuiTableCellPosition,
    current: NuiTableRanges,
  ): NuiTableContextScope<T> | undefined => {
    const target = own.anchorOf(focused);
    const row = table.rowFor(target.row);
    const key = dataKeyAt(table.layout(), target.col);
    const pinned = target.row < table.pinnedRows();

    return row === undefined || key === undefined
      ? undefined
      : {
          ...table.scopeOf(row, pinned ? target.row : target.row - table.pinnedRows(), key, pinned),
          ranges: current,
        };
  };

  return useTableContextMenu<T>({
    enabled: () => {
      const option = own.option();

      return option === undefined ? own.cellSelection() : option !== false;
    },
    extra: () => {
      const option = own.option();

      return option === false ? undefined : option;
    },
    frame: () => table.frame.value,
    anchor: () => anchor.value,
    viewport: () => table.viewport.value,
    headRows: table.headRows,
    scopeOf: scopeFor,
    select: selectFor,
    copyable: () => own.clipboard.copyable(),
    copy: (headers) => {
      void own.clipboard.copy(headers);
    },
    editable: own.editable,
    clearable: () => own.editing.clearable(),
    cut: () => {
      void own.editing.cut();
    },
    clear: () => {
      own.editing.clear();
    },
    pastable: () => own.editing.pastable(),
    paste: () => {
      void own.editing.pasteFromClipboard();
    },
    show: (focusOn) => {
      menuNode.value?.show(focusOn);
    },
    isRtl: table.isRtl,
    messages: table.messages,
  });
};
