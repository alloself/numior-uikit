import { computed, useTemplateRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import type { Intent } from '@numior/primitives';
import type { NuiMenuExposed } from '@numior/vue';
import type { TableDistinct, TableFilterValue } from '../../engine';
import { valueTextOf, type BooleanTexts } from '../table-format';
import { dataKeyAt, dataKeysOf } from '../table-layout';
import type { TableColumnOrder } from '../use-table-column-order';
import { useTableHeader, type TableFilterTarget, type TableHeader } from '../use-table-header';
import { useTableMenu, type TableMenu } from '../use-table-menu';
import type { TableResize } from '../use-table-resize';
import {
  NuiTableColumnType,
  type NuiTableColumn,
  type NuiTableColumnMenu,
  type NuiTableFilters,
  type NuiTableGroupBy,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableSort,
  type NuiTableWidths,
  type TableHeaderTarget,
} from '../table.types';
import type { TableContext } from './table-context';

export interface HeaderAreaOptions<T> {
  readonly sort: Ref<NuiTableSort>;
  readonly filters: Ref<NuiTableFilters>;
  readonly groupBy: Ref<NuiTableGroupBy>;
  readonly pins: Ref<NuiTablePins>;
  readonly hidden: Ref<NuiTableHidden>;
  readonly widths: Ref<NuiTableWidths>;
  readonly target: ShallowRef<TableFilterTarget | null>;
  readonly open: Ref<boolean>;
  readonly columnMenu: () => NuiTableColumnMenu<T> | boolean;
  readonly leaves: () => readonly NuiTableColumn<T>[];
  readonly treeMode: () => boolean;
  readonly resize: TableResize;
  readonly order: TableColumnOrder;
  readonly rowsIntent: Intent<true>;
  readonly focusHeader: (target: TableHeaderTarget) => void;
  readonly locale: () => string;
  readonly booleanTexts: () => BooleanTexts;
}

export interface HeaderArea<T> {
  readonly header: TableHeader<T>;
  readonly menu: TableMenu;
  readonly menuAnchor: ComputedRef<HTMLElement | null>;
  readonly valueLabel: (value: TableFilterValue) => string;
  readonly loadValues: (search: string, signal: AbortSignal) => Promise<TableDistinct | null>;
}

const DISTINCT_LIMIT = 100;

export const useHeaderArea = <T>(
  table: TableContext<T>,
  own: HeaderAreaOptions<T>,
): HeaderArea<T> => {
  const menuNode = useTemplateRef<NuiMenuExposed>('menu-node');

  const header: TableHeader<T> = useTableHeader({
    keys: () => dataKeysOf(table.layout()),
    keyAt: (visual) => dataKeyAt(table.layout(), visual),
    columnAt: table.columnAt,
    sort: own.sort,
    filters: own.filters,
    target: own.target,
    open: own.open,
    messages: table.messages,
    announce: table.announce,
    filtered: (changed) => {
      if (changed) {
        own.rowsIntent.set(true);
        return;
      }

      const count = table.engine.value.rowCount();

      table.announce(table.messages.value.rowsShown({ count }));
      table.emit('settle', { rows: count });
    },
    menu: (key, anchor, focusOn) => menu.openAt(key, anchor, focusOn),
    resizable: (key) => own.resize.resizable(key),
    resizing: (key) => own.resize.active.value === key,
    resize: (key, event) => own.resize.onKeydown(key, event),
    reorderable: (key) => own.order.reorderable(key),
    dragging: (key) => own.order.dragging.value === key,
    reorder: (key, event) => own.order.onKeydown(key, event),
  });

  const menu: TableMenu = useTableMenu({
    enabled: () => own.columnMenu() !== false,
    extra: (key, anchor) => {
      const option = own.columnMenu();

      return typeof option === 'function' ? option({ column: table.columnAt(key), anchor }) : [];
    },
    leaves: own.leaves,
    layout: table.layout,
    columnAt: table.columnAt,
    head: (key) => header.head(key),
    sort: own.sort,
    groupBy: own.groupBy,
    pins: own.pins,
    hidden: own.hidden,
    widths: own.widths,
    resetWidth: (key) => {
      own.resize.reset(key);
    },
    treeMode: own.treeMode,
    messages: table.messages,
    announce: table.announce,
    openFilter: (key, anchor) => {
      header.openFilterAt(key, anchor);
    },
    show: (focusOn) => {
      menuNode.value?.show(focusOn);
    },
    refocus: (target) => {
      own.focusHeader(target);
    },
  });

  const menuAnchor = computed(() => menu.target.value?.anchor ?? null);

  const valueLabel = (value: TableFilterValue): string => {
    const current = header.target.value;

    const text =
      current === null
        ? ''
        : valueTextOf(
            table.columnAt(current.key),
            value,
            undefined,
            own.locale(),
            own.booleanTexts(),
          );

    return text === '' ? table.messages.value.blank : text;
  };

  const loadValues = (search: string, signal: AbortSignal): Promise<TableDistinct | null> => {
    const current = header.target.value;

    if (current === null) {
      return Promise.resolve(null);
    }
    const column = table.columnAt(current.key);
    const plain = column.type === NuiTableColumnType.Text && column.format === undefined;

    return table.engine.value.distinct(current.key, {
      limit: DISTINCT_LIMIT,
      search,
      text: plain ? undefined : valueLabel,
      signal,
    });
  };

  return { header, menu, menuAnchor, valueLabel, loadValues };
};
