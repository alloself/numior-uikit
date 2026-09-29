import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { filterKindOf, filterOf, withFilter } from './table-filter';
import { headStates, nextSort } from './table-sort';
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
}

export interface TableHeader<T> {
  readonly heads: ComputedRef<Readonly<Record<string, TableHeadState>>>;
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
const RESIZER = '.nui-table__resizer';

const headerOf = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element) || target.closest(RESIZER) !== null) {
    return null;
  }
  const cell = target.closest(HEADER);

  return cell instanceof HTMLElement ? cell : null;
};

const plainKey = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey;

export const useTableHeader = <T>(options: TableHeaderOptions<T>): TableHeader<T> => {
  const target = shallowRef<TableFilterTarget | null>(null);
  const open = ref(false);

  const heads = computed(() =>
    headStates({
      keys: options.keys(),
      sort: options.sort.value,
      sortable: (key) => options.columnAt(key).sortable !== false,
      filterable: (key) => filterKindOf(options.columnAt(key)) !== undefined,
      filtered: (key) => filterOf(options.filters.value, key) !== undefined,
      resizable: options.resizable,
      resizing: options.resizing,
    }),
  );

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
        entry.direction === 'asc'
          ? texts.sortedAscending({ column })
          : texts.sortedDescending({ column }),
      );
    }
  };

  const toggleSort = (key: string, multi: boolean): void => {
    if (heads.value[key]?.sortable !== true) {
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

  const onKeydown = (event: KeyboardEvent): boolean => {
    const cell = headerOf(event.target);
    const key = event.target === cell ? keyOf(cell) : undefined;

    if (cell === null || key === undefined) {
      return false;
    }
    if ((event.key === 'Enter' || event.key === ' ') && plainKey(event)) {
      event.preventDefault();
      toggleSort(key, event.shiftKey);
      return true;
    }
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      return options.resize(key, event);
    }
    if (event.key !== 'ArrowDown' || !event.altKey) {
      return false;
    }
    if (options.menu(key, cell, 'first')) {
      event.preventDefault();
      return true;
    }
    if (heads.value[key]?.filterable === true) {
      event.preventDefault();
      openFor(key, cell);
      return true;
    }
    return false;
  };

  return {
    heads,
    target,
    open,
    scope: (key) => ({ column: options.columnAt(key), direction: heads.value[key]?.direction }),
    sortHint: (key) => {
      const order = heads.value[key]?.order;
      return order === undefined ? '' : options.messages.value.sortKey({ order });
    },
    filterOf: (key) => filterOf(options.filters.value, key),
    expanded: (key) => (open.value && target.value?.key === key ? 'true' : 'false'),
    onClick: (event) => {
      const key = keyOf(headerOf(event.target));

      if (key !== undefined) {
        toggleSort(key, event.shiftKey);
      }
    },
    onKeydown,
    openFilter: (key, event) => {
      const cell = headerOf(event.target);

      if (cell !== null) {
        openFor(key, cell);
      }
    },
    openFilterAt: openFor,
    openMenu: (key, event) => {
      const cell = headerOf(event.target);

      if (cell !== null) {
        options.menu(key, cell);
      }
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
