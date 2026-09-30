import type { NuiMenuEntry } from '@numior/vue';
import type { TableSortDirection } from '../engine';
import type { NuiTableMessages } from './table.messages';
import type { NuiTablePin } from './table.types';

export interface MenuColumnChoice {
  readonly key: string;
  readonly label: string;
  readonly shown: boolean;
  readonly locked: boolean;
}

export interface ColumnMenuState {
  readonly direction: TableSortDirection | undefined;
  readonly sortable: boolean;
  readonly filterable: boolean;
  readonly groupable: boolean;
  readonly grouped: boolean;
  readonly pin: NuiTablePin | undefined;
  readonly hideable: boolean;
  readonly resized: boolean;
  readonly columns: readonly MenuColumnChoice[];
}

export interface ColumnMenuActions {
  sortBy(direction: TableSortDirection | undefined): void;
  filter(): void;
  group(grouped: boolean): void;
  pin(pin: NuiTablePin | undefined): void;
  hide(): void;
  show(key: string, shown: boolean): void;
  resetWidth(): void;
}

const pinValue = (value: string): NuiTablePin | undefined =>
  value === 'start' || value === 'end' ? value : undefined;

const sortSection = (
  state: ColumnMenuState,
  actions: ColumnMenuActions,
  texts: NuiTableMessages,
): NuiMenuEntry[] => {
  const entries: NuiMenuEntry[] = [];

  if (state.sortable) {
    entries.push(
      {
        key: 'sort-asc',
        label: texts.menuSortAscending,
        icon: 'arrow-up',
        disabled: state.direction === 'asc',
        onSelect: () => actions.sortBy('asc'),
      },
      {
        key: 'sort-desc',
        label: texts.menuSortDescending,
        icon: 'arrow-down',
        disabled: state.direction === 'desc',
        onSelect: () => actions.sortBy('desc'),
      },
      {
        key: 'sort-clear',
        label: texts.menuSortClear,
        icon: 'arrow-up-down',
        disabled: state.direction === undefined,
        onSelect: () => actions.sortBy(undefined),
      },
    );
  }
  if (state.filterable) {
    entries.push({
      key: 'filter',
      label: texts.menuFilter,
      icon: 'filter',
      onSelect: actions.filter,
    });
  }
  return entries;
};

const groupSection = (
  state: ColumnMenuState,
  actions: ColumnMenuActions,
  texts: NuiTableMessages,
): NuiMenuEntry[] =>
  state.groupable
    ? [
        {
          key: 'group',
          label: state.grouped ? texts.menuUngroup : texts.menuGroup,
          icon: 'list-tree',
          onSelect: () => actions.group(!state.grouped),
        },
      ]
    : [];

const pinSection = (
  state: ColumnMenuState,
  actions: ColumnMenuActions,
  texts: NuiTableMessages,
): NuiMenuEntry[] => [
  { type: 'label', key: 'pin-label', label: texts.menuPin },
  {
    type: 'radio-group',
    key: 'pin',
    value: state.pin ?? 'none',
    onChange: (value) => actions.pin(pinValue(value)),
    items: [
      { value: 'start', label: texts.menuPinStart },
      { value: 'none', label: texts.menuPinNone },
      { value: 'end', label: texts.menuPinEnd },
    ],
  },
];

const widthSection = (
  state: ColumnMenuState,
  actions: ColumnMenuActions,
  texts: NuiTableMessages,
): NuiMenuEntry[] =>
  state.resized
    ? [
        {
          key: 'width-reset',
          label: texts.menuResetWidth,
          icon: 'move-horizontal',
          onSelect: actions.resetWidth,
        },
      ]
    : [];

const visibilitySection = (
  state: ColumnMenuState,
  actions: ColumnMenuActions,
  texts: NuiTableMessages,
): NuiMenuEntry[] => [
  {
    key: 'hide',
    label: texts.menuHide,
    icon: 'eye-off',
    disabled: !state.hideable,
    onSelect: actions.hide,
  },
  {
    type: 'sub',
    key: 'columns',
    label: texts.menuColumns,
    icon: 'columns',
    items: state.columns.map((choice): NuiMenuEntry => ({
      type: 'checkbox',
      key: choice.key,
      label: choice.label,
      checked: choice.shown,
      disabled: choice.locked,
      onCheckedChange: (checked) => actions.show(choice.key, checked),
    })),
  },
];

export const columnMenuEntries = (
  state: ColumnMenuState,
  actions: ColumnMenuActions,
  texts: NuiTableMessages,
): NuiMenuEntry[] =>
  [
    sortSection(state, actions, texts),
    groupSection(state, actions, texts),
    pinSection(state, actions, texts),
    widthSection(state, actions, texts),
    visibilitySection(state, actions, texts),
  ]
    .filter((section) => section.length > 0)
    .flatMap((section, index): NuiMenuEntry[] =>
      index === 0 ? section : [{ type: 'separator', key: `separator-${index}` }, ...section],
    );
