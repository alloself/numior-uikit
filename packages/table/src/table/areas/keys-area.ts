import { onBeforeUnmount } from 'vue';
import { onLongPress } from '@vueuse/core';
import { ownDetailOf, rowPositionOf } from '../table-dom';
import type { TableCellEditor } from '../use-table-cell-editor';
import type { TableClipboard } from '../use-table-clipboard';
import type { TableContextMenu } from '../use-table-context-menu';
import type { TableEditing } from '../use-table-editing';
import type { TableExpansion } from '../use-table-expansion';
import type { TableFocus } from '../use-table-focus';
import type { TableHeader } from '../use-table-header';
import type { TablePicking } from '../use-table-picking';
import type { TableRanges } from '../use-table-ranges';
import type { TableRowDrag } from '../use-table-row-drag';
import type { TableRowResize } from '../use-table-row-resize';
import type { TableSelection } from '../use-table-selection';
import type { NuiTableCellPosition } from '../table.types';
import type { TableContext } from './table-context';

export interface KeysAreaOptions<T> {
  readonly cellSelection: () => boolean;
  readonly cellMenu: TableContextMenu;
  readonly clipboard: TableClipboard;
  readonly cellEditor: TableCellEditor<T>;
  readonly editing: TableEditing<T>;
  readonly picker: TablePicking;
  readonly ranges: TableRanges;
  readonly rowResize: TableRowResize;
  readonly rowDrag: TableRowDrag;
  readonly selection: TableSelection<T>;
  readonly header: TableHeader<T>;
  readonly expansion: TableExpansion;
  readonly focus: TableFocus;
  readonly bodyActive: () => NuiTableCellPosition | undefined;
  readonly activeRowHead: () => number | undefined;
}

export interface TableViewportEvents {
  readonly keydown: (event: KeyboardEvent) => void;
  readonly focusin: (event: FocusEvent) => void;
  readonly pointerdown: (event: PointerEvent) => void;
  readonly mousedown: (event: MouseEvent) => void;
  readonly contextmenu: (event: MouseEvent) => void;
  readonly paste: (event: ClipboardEvent) => void;
  readonly click: (event: MouseEvent) => void;
  readonly dblclick: (event: MouseEvent) => void;
  readonly pointerup: (event: PointerEvent) => void;
}

export interface KeysArea {
  readonly onRowsClick: (event: MouseEvent) => void;
  readonly viewportEvents: TableViewportEvents;
}

const CLICK_GUARD =
  '.nui-table__cell--select, .nui-table__cell--rowhead, .nui-table__row-grip, .nui-table__toggle, .nui-table__group, .nui-table__editor';

const LONG_PRESS = 500;

export const useKeysArea = <T>(table: TableContext<T>, own: KeysAreaOptions<T>): KeysArea => {
  const { cellMenu, cellEditor, editing, picker, ranges, focus } = own;

  let unmounted = false;

  const inDetail = (event: Event): boolean =>
    ownDetailOf(event.target, table.viewport.value) !== null;

  onBeforeUnmount(() => {
    unmounted = true;
  });

  onLongPress(
    table.viewport,
    (event) => {
      if (unmounted || inDetail(event) || !cellMenu.onLongPress(event)) {
        return;
      }

      ranges.swallowClick();
    },
    { delay: LONG_PRESS },
  );

  const onRowsClick = (event: MouseEvent): void => {
    const target = event.target;

    if (
      ranges.takeClick() ||
      !(target instanceof Element) ||
      inDetail(event) ||
      target.closest(CLICK_GUARD) !== null
    ) {
      return;
    }

    const visual = rowPositionOf(target.closest('[role="row"]'), table.headRows());

    const row = Number.isInteger(visual) ? table.rowFor(visual) : undefined;

    if (row === undefined) {
      return;
    }

    table.emit('rowClick', row, event);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (
      cellMenu.onKeydown(event) ||
      own.clipboard.onKeydown(event) ||
      cellEditor.onKeydown(event) ||
      editing.onKeydown(event) ||
      ranges.onKeydown(event)
    ) {
      return;
    }
    if (
      own.rowResize.onKeydown(event, own.activeRowHead()) ||
      own.rowDrag.onKeydown(event, own.bodyActive())
    ) {
      return;
    }
    const active = table.active();

    if (own.selection.onKeydown(event, active, table.rowFor(active.row))) {
      return;
    }
    const body = own.bodyActive();

    if (
      own.header.onKeydown(event) ||
      (body !== undefined && own.expansion.onKeydown(event, body))
    ) {
      return;
    }

    focus.onKeydown(event);
  };

  const outsideDetail =
    <E extends Event>(handler: (event: E) => void) =>
    (event: E): void => {
      if (inDetail(event)) {
        return;
      }

      handler(event);
    };

  const viewportEvents: TableViewportEvents = {
    keydown: outsideDetail(onKeydown),
    focusin: (event: FocusEvent): void => {
      cellEditor.onFocusin(event);

      focus.onFocusin(
        ownDetailOf(event.target, table.viewport.value)?.parentElement ?? event.target,
      );
    },
    pointerdown: outsideDetail((event: PointerEvent) => {
      focus.notePress(event.target);

      if (picker.onPointerdown(event)) {
        return;
      }

      ranges.onPointerdown(event);
    }),
    mousedown: outsideDetail((event: MouseEvent) => {
      if (picker.onMousedown(event)) {
        return;
      }

      ranges.onMousedown(event);
    }),
    contextmenu: outsideDetail((event: MouseEvent) => {
      cellMenu.onContextmenu(event);
    }),
    paste: outsideDetail((event: ClipboardEvent) => {
      editing.onPaste(event);
    }),
    click: outsideDetail((event: MouseEvent) => {
      if (picker.onClick(event)) {
        return;
      }

      ranges.onClick(event);
      cellEditor.onClick(event);

      if (!own.cellSelection()) {
        return;
      }

      focus.reclaim();
    }),
    dblclick: outsideDetail((event: MouseEvent) => {
      if (cellEditor.onDblclick(event)) {
        return;
      }

      ranges.onDblclick(event);
    }),
    pointerup: outsideDetail((event: PointerEvent) => {
      cellEditor.onPointerup(event);
    }),
  };

  return { onRowsClick, viewportEvents };
};
