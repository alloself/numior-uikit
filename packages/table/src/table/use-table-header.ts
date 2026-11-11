import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { filterKindOf, filterOf, withFilter } from './table-filter';
import { headStateOf, nextSort, type HeadStateInput } from './table-sort';
import type { NuiTableMessages } from './table.messages';
import type {
  TableHeadState,
  NuiTableFilters,
  NuiTableHeaderSlot,
  NuiTableSort,
  NuiTableColumn,
  NuiTableColumnFilter,
  NuiTableFilterKind,
} from './table.types';
import { Key } from '@numior/primitives';
import { TableSortDirection } from '../engine';

export interface TableFilterTarget {
  readonly key: string;
  readonly kind: NuiTableFilterKind;
  readonly anchor: HTMLElement;
}

export interface TableHeaderOptions<T> {
  readonly keys: () => readonly string[];
  readonly keyAt: (visual: number) => string | undefined;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly sort: Ref<NuiTableSort>;
  readonly filters: Ref<NuiTableFilters>;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly filtered: () => void;
  readonly menu: (key: string, anchor: HTMLElement, focus?: 'first') => boolean;
  readonly resizable: (key: string) => boolean;
  readonly resizing: (key: string) => boolean;
  readonly resize: (key: string, event: KeyboardEvent) => boolean;
  readonly reorderable: (key: string) => boolean;
  readonly dragging: (key: string) => boolean;
  readonly reorder: (key: string, event: KeyboardEvent) => boolean;
}

export interface TableHeader<T> {
  head(key: string): TableHeadState | undefined;
  readonly target: Readonly<ShallowRef<TableFilterTarget | null>>;
  readonly open: Ref<boolean>;
  scope(key: string): NuiTableHeaderSlot<T>;
  sortHint(key: string): string;
  filterOf(key: string): NuiTableColumnFilter | undefined;
  expanded(key: string): 'true' | 'false';
  onClick(event: MouseEvent): void;
  onKeydown(event: KeyboardEvent): boolean;
  openFilter(key: string, event: Event): void;
  openFilterAt(key: string, anchor: HTMLElement): void;
  openMenu(key: string, event: Event): void;
  applyFilter(next: NuiTableColumnFilter | null): void;
}

const HEADER = '.nui-table__row--head > [role="columnheader"]';
const HANDLE = '.nui-table__resizer, .nui-table__grip';

const headerOf = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element) || target.closest(HANDLE) !== null) {
    return null;
  }
  const cell = target.closest(HEADER);

  return cell instanceof HTMLElement ? cell : null;
};

const plainKey = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey;

const isSortKey = (event: KeyboardEvent): boolean =>
  (event.key === Key.Enter || event.key === Key.Space) && plainKey(event);

const isSideArrow = (key: string): boolean => key === Key.ArrowLeft || key === Key.ArrowRight;

export const useTableHeader = <T>(options: TableHeaderOptions<T>): TableHeader<T> => {
  const target = shallowRef<TableFilterTarget | null>(null);
  const open = ref(false);

  const known = computed(() => new Set(options.keys()));

  const input: HeadStateInput = {
    sorting: () => options.sort.value,
    sortable: (key) => options.columnAt(key).sortable !== false,
    filterable: (key) => filterKindOf(options.columnAt(key)) !== undefined,
    filtered: (key) => filterOf(options.filters.value, key) !== undefined,
    resizable: options.resizable,
    resizing: options.resizing,
    reorderable: options.reorderable,
    dragging: options.dragging,
  };

  const head = (key: string): TableHeadState | undefined =>
    known.value.has(key) ? headStateOf(input, key) : undefined;

  const keyOf = (cell: HTMLElement | null): string | undefined =>
    cell === null ? undefined : options.keyAt(Number(cell.getAttribute('aria-colindex')) - 1);

  const announceSort = (key: string, next: NuiTableSort): void => {
    const entry = next.find((candidate) => candidate.key === key);
    const column = options.columnAt(key).label;
    const texts = options.messages.value;

    if (entry === undefined) {
      options.announce(texts.sortCleared);
    } else {
      options.announce(
        entry.direction === TableSortDirection.Asc
          ? texts.sortedAscending({ column })
          : texts.sortedDescending({ column }),
      );
    }
  };

  const toggleSort = (key: string, multi: boolean): void => {
    if (head(key)?.sortable !== true) {
      return;
    }
    const next = nextSort(options.sort.value, key, multi);

    options.sort.value = next;
    announceSort(key, next);
  };

  const openFor = (key: string, anchor: HTMLElement): void => {
    const kind = filterKindOf(options.columnAt(key));

    if (kind === undefined) {
      return;
    }
    target.value = { key, kind, anchor };
    open.value = true;
  };

  const openMenuOrFilter = (key: string, cell: HTMLElement, event: KeyboardEvent): boolean => {
    if (options.menu(key, cell, 'first')) {
      event.preventDefault();
      return true;
    }
    if (head(key)?.filterable !== true) {
      return false;
    }

    event.preventDefault();
    openFor(key, cell);
    return true;
  };

  const onKeydown = (event: KeyboardEvent): boolean => {
    const cell = headerOf(event.target);
    const key = event.target === cell ? keyOf(cell) : undefined;

    if (cell === null || key === undefined) {
      return false;
    }
    if (isSortKey(event)) {
      event.preventDefault();
      toggleSort(key, event.shiftKey);
      return true;
    }
    if (event.altKey && isSideArrow(event.key)) {
      return event.shiftKey ? options.reorder(key, event) : options.resize(key, event);
    }
    return event.altKey && event.key === Key.ArrowDown && openMenuOrFilter(key, cell, event);
  };

  return {
    head,
    target,
    open,
    scope: (key) => ({ column: options.columnAt(key), direction: head(key)?.direction }),
    sortHint: (key) => {
      const order = head(key)?.order;
      return order === undefined ? '' : options.messages.value.sortKey({ order });
    },
    filterOf: (key) => filterOf(options.filters.value, key),
    expanded: (key) => (open.value && target.value?.key === key ? 'true' : 'false'),
    onClick: (event) => {
      const key = keyOf(headerOf(event.target));

      if (key === undefined) {
        return;
      }

      toggleSort(key, event.shiftKey);
    },
    onKeydown,
    openFilter: (key, event) => {
      const cell = headerOf(event.target);

      if (cell === null) {
        return;
      }

      openFor(key, cell);
    },
    openFilterAt: openFor,
    openMenu: (key, event) => {
      const cell = headerOf(event.target);

      if (cell === null) {
        return;
      }

      options.menu(key, cell);
    },
    applyFilter: (next) => {
      const current = target.value;

      if (current === null) {
        return;
      }
      options.filters.value = withFilter(options.filters.value, current.key, next);
      options.filtered();
    },
  };
};
