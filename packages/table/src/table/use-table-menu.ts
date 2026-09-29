import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import type { NuiMenuEntry, NuiMenuFocus } from '@numior/vue';
import type { TableSortDirection } from '../engine';
import type { NuiTableMessages } from './table.messages';
import type { TableLayout } from './table-layout';
import { dataKeysOf, pinOf } from './table-layout';
import { columnMenuEntries, type ColumnMenuActions, type ColumnMenuState } from './table-menu';
import type {
  TableHeaderTarget,
  TableHeadState,
  NuiTableGroupBy,
  NuiTableHidden,
  NuiTablePins,
  NuiTableSort,
  NuiTableColumn,
  NuiTablePin,
  NuiTableWidths,
} from './table.types';

export interface TableMenuTarget {
  readonly key: string;
  readonly anchor: HTMLElement;
}

export interface TableMenuOptions<T> {
  readonly enabled: () => boolean;
  readonly leaves: () => readonly NuiTableColumn<T>[];
  readonly layout: () => TableLayout;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly heads: () => Readonly<Record<string, TableHeadState>>;
  readonly sort: Ref<NuiTableSort>;
  readonly groupBy: Ref<NuiTableGroupBy>;
  readonly pins: Ref<NuiTablePins>;
  readonly hidden: Ref<NuiTableHidden>;
  readonly widths: Ref<NuiTableWidths>;
  readonly resetWidth: (key: string) => void;
  readonly treeMode: () => boolean;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly openFilter: (key: string, anchor: HTMLElement) => void;
  readonly show: (focus: NuiMenuFocus | undefined) => void;
  readonly refocus: (target: TableHeaderTarget) => void;
}

export interface TableMenu {
  readonly target: Readonly<ShallowRef<TableMenuTarget | null>>;
  readonly open: Ref<boolean>;
  readonly items: ComputedRef<readonly NuiMenuEntry[]>;
  readonly label: ComputedRef<string | undefined>;
  openAt(key: string, anchor: HTMLElement, focus?: NuiMenuFocus): boolean;
  labelOf(key: string): string | undefined;
  expanded(key: string): 'true' | 'false';
}

const pinText = (texts: NuiTableMessages, pin: NuiTablePin | undefined, column: string) => {
  switch (pin) {
    case 'start':
      return texts.columnPinnedStart({ column });
    case 'end':
      return texts.columnPinnedEnd({ column });
    case undefined:
      return texts.columnUnpinned({ column });
  }
};

const sortText = (
  texts: NuiTableMessages,
  direction: TableSortDirection | undefined,
  column: string,
): string => {
  switch (direction) {
    case 'asc':
      return texts.sortedAscending({ column });
    case 'desc':
      return texts.sortedDescending({ column });
    case undefined:
      return texts.sortCleared;
  }
};

export const useTableMenu = <T>(options: TableMenuOptions<T>): TableMenu => {
  const target = shallowRef<TableMenuTarget | null>(null);
  const open = ref(false);

  const shownKeys = (): readonly string[] => dataKeysOf(options.layout());

  const stateOf = (key: string): ColumnMenuState => {
    const column = options.columnAt(key);
    const head = options.heads()[key];
    const shown = shownKeys();

    return {
      direction: head?.direction,
      sortable: head?.sortable === true,
      filterable: head?.filterable === true,
      groupable: !options.treeMode(),
      grouped: options.groupBy.value.includes(key),
      pin: pinOf(column, options.pins.value),
      hideable: column.hideable !== false && shown.length > 1,
      resized: key in options.widths.value,
      columns: options.leaves().map((leaf) => {
        const visible = shown.includes(leaf.key);

        return {
          key: leaf.key,
          label: leaf.label,
          shown: visible,
          locked: leaf.hideable === false || (visible && shown.length === 1),
        };
      }),
    };
  };

  const actionsFor = (current: TableMenuTarget): ColumnMenuActions => {
    const { key, anchor } = current;
    const label = options.columnAt(key).label;
    const texts = options.messages.value;
    const slot = (): TableHeaderTarget => ({ kind: 'slot', index: shownKeys().indexOf(key) });

    return {
      sortBy: (direction) => {
        options.sort.value =
          direction === undefined
            ? options.sort.value.filter((entry) => entry.key !== key)
            : [{ key, direction }];

        options.announce(sortText(texts, direction, label));
      },
      filter: () => {
        options.openFilter(key, anchor);
      },
      group: (grouped) => {
        options.groupBy.value = grouped
          ? [...options.groupBy.value, key]
          : options.groupBy.value.filter((entry) => entry !== key);
      },
      pin: (pin) => {
        options.pins.value = { ...options.pins.value, [key]: pin ?? null };
        options.announce(pinText(texts, pin, label));
        options.refocus({ kind: 'column', key });
      },
      hide: () => {
        const place = slot();

        options.hidden.value = [...options.hidden.value, key];
        options.announce(texts.columnHidden({ column: label }));
        options.refocus(place);
      },
      resetWidth: () => {
        options.resetWidth(key);
      },
      show: (choice, shown) => {
        const column = options.columnAt(choice).label;
        const place = choice === key && !shown ? slot() : undefined;

        options.hidden.value = shown
          ? options.hidden.value.filter((entry) => entry !== choice)
          : [...options.hidden.value, choice];

        options.announce(shown ? texts.columnShown({ column }) : texts.columnHidden({ column }));

        if (place !== undefined) {
          open.value = false;
          options.refocus(place);
        }
      },
    };
  };

  const items = computed<readonly NuiMenuEntry[]>(() => {
    const current = target.value;

    return current === null
      ? []
      : columnMenuEntries(stateOf(current.key), actionsFor(current), options.messages.value);
  });

  const labelOf = (key: string): string | undefined =>
    options.enabled()
      ? options.messages.value.columnMenu({ column: options.columnAt(key).label })
      : undefined;

  return {
    target,
    open,
    items,
    label: computed(() => (target.value === null ? undefined : labelOf(target.value.key))),
    openAt: (key, anchor, focus) => {
      if (!options.enabled()) {
        return false;
      }
      target.value = { key, anchor };
      options.show(focus);
      return true;
    },
    labelOf,
    expanded: (key) => (open.value && target.value?.key === key ? 'true' : 'false'),
  };
};
