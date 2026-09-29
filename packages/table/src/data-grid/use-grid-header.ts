import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { filterKindOf, filterOf, withFilter } from './grid-filter';
import { headStates, nextSort } from './grid-sort';
import type { NuiDataGridMessages } from './data-grid.messages';
import type {
  GridHeadState,
  NuiDataGridFilters,
  NuiDataGridHeaderSlot,
  NuiDataGridSort,
  NuiGridColumn,
  NuiGridColumnFilter,
  NuiGridFilterKind,
} from './data-grid.types';

export interface GridFilterTarget {
  readonly key: string;
  readonly kind: NuiGridFilterKind;
  readonly anchor: HTMLElement;
}

export interface GridHeaderOptions<T> {
  readonly keys: () => readonly string[];
  readonly keyAt: (visual: number) => string | undefined;
  readonly columnAt: (key: string) => NuiGridColumn<T>;
  readonly sort: Ref<NuiDataGridSort>;
  readonly filters: Ref<NuiDataGridFilters>;
  readonly messages: ComputedRef<NuiDataGridMessages>;
  readonly announce: (text: string) => void;
  readonly filtered: () => void;
  readonly menu: (key: string, anchor: HTMLElement, focus?: 'first') => boolean;
}

export interface GridHeader<T> {
  readonly heads: ComputedRef<Readonly<Record<string, GridHeadState>>>;
  readonly target: Readonly<ShallowRef<GridFilterTarget | null>>;
  readonly open: Ref<boolean>;
  scope(key: string): NuiDataGridHeaderSlot<T>;
  sortHint(key: string): string;
  filterOf(key: string): NuiGridColumnFilter | undefined;
  expanded(key: string): 'true' | 'false';
  onClick(event: MouseEvent): void;
  onKeydown(event: KeyboardEvent): boolean;
  openFilter(key: string, event: Event): void;
  openFilterAt(key: string, anchor: HTMLElement): void;
  openMenu(key: string, event: Event): void;
  applyFilter(next: NuiGridColumnFilter | null): void;
}

const HEADER = '.nui-grid__row--head > .nui-grid__pane > [role="columnheader"]';

const headerOf = (target: EventTarget | null): HTMLElement | null => {
  const cell = target instanceof Element ? target.closest(HEADER) : null;
  return cell instanceof HTMLElement ? cell : null;
};

const plainKey = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey;

export const useGridHeader = <T>(options: GridHeaderOptions<T>): GridHeader<T> => {
  const target = shallowRef<GridFilterTarget | null>(null);
  const open = ref(false);

  const heads = computed(() =>
    headStates({
      keys: options.keys(),
      sort: options.sort.value,
      sortable: (key) => options.columnAt(key).sortable !== false,
      filterable: (key) => filterKindOf(options.columnAt(key)) !== undefined,
      filtered: (key) => filterOf(options.filters.value, key) !== undefined,
    }),
  );

  const keyOf = (cell: HTMLElement | null): string | undefined =>
    cell === null ? undefined : options.keyAt(Number(cell.getAttribute('aria-colindex')) - 1);

  const announceSort = (key: string, next: NuiDataGridSort): void => {
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
