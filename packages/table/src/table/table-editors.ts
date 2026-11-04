import type { Component } from 'vue';
import {
  formatIsoDate,
  parseIsoDate,
  type ControlProps,
  type ControlValue,
  type EmitsInto,
  type Guard,
  type NuiControlRegistry,
} from '@numior/primitives';
import { NuiDatePicker, NuiInput, NuiNumberField } from '@numior/vue';
import { instantOf } from './table-format';
import {
  NuiTableColumnType,
  type NuiTableCellValue,
  type NuiTableColumn,
  type NuiTableColumnEditor,
  type NuiTableControlEditor,
  type NuiTableEditor,
  type NuiTableEditRefusalReason,
  type ParsedCell,
  type TableCellEditorSpec,
  type TableEditorPlan,
} from './table.types';

export interface NuiTableEditorOptions<C, M extends string> {
  readonly model?: M | undefined;
  readonly props?: ControlProps<C, M> | undefined;
}

interface EditorSource {
  readonly component: Component;
  readonly model: string;
  readonly accepts: (value: unknown) => boolean;
  readonly props: Readonly<Record<string, unknown>>;
}

type Conversion = Pick<TableCellEditorSpec, 'toControl' | 'fromControl'>;

type ColumnType = NuiTableColumn<unknown>['type'];

const MODEL = 'modelValue';
const INVALID: ParsedCell = { kind: 'invalid' };
const EMPTY: ParsedCell = { kind: 'value', value: null };
const TOGGLE: TableEditorPlan = { kind: 'toggle' };

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

const cellOf = (value: NuiTableCellValue): ParsedCell => ({ kind: 'value', value });

const isoOf = (value: NuiTableCellValue): string | undefined => {
  const time = instantOf(value);

  if (Number.isNaN(time)) {
    return undefined;
  }
  const date = new Date(time);

  return formatIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
};

const dateOf = (value: unknown): ParsedCell => {
  const parts = typeof value === 'string' ? parseIsoDate(value) : null;

  return parts === null
    ? INVALID
    : cellOf(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
};

const asIs = (value: NuiTableCellValue): unknown => value ?? undefined;

const typed =
  (matches: (value: unknown) => value is NuiTableCellValue) =>
  (value: unknown): ParsedCell => {
    if (isEmpty(value)) {
      return EMPTY;
    }
    return matches(value) ? cellOf(value) : INVALID;
  };

const isText = (value: unknown): value is string => typeof value === 'string';

const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

const isFlag = (value: unknown): value is boolean => typeof value === 'boolean';

const CONVERSIONS: Readonly<Record<ColumnType, Conversion>> = {
  text: { toControl: asIs, fromControl: typed(isText) },
  number: { toControl: asIs, fromControl: typed(isAmount) },
  boolean: { toControl: asIs, fromControl: typed(isFlag) },
  date: {
    toControl: isoOf,
    fromControl: (value) => (isEmpty(value) ? EMPTY : dateOf(value)),
  },
};

const builtinOf = (
  type: Exclude<ColumnType, 'boolean'>,
  locale: string,
): Omit<EditorSource, 'accepts'> => {
  switch (type) {
    case NuiTableColumnType.Text:
      return { component: NuiInput, model: MODEL, props: {} };
    case NuiTableColumnType.Number:
      return { component: NuiNumberField, model: MODEL, props: { locale, steppers: false } };
    case NuiTableColumnType.Date:
      return { component: NuiDatePicker, model: MODEL, props: { locale } };
  }
};

export const tableEditor = <
  C extends Component,
  V extends ControlValue<C, M>,
  M extends string = 'modelValue',
>(
  component: C & EmitsInto<C, V, M>,
  accepts: Guard<V>,
  options: NuiTableEditorOptions<C, M> = {},
): NuiTableEditor<V> => ({
  kind: 'component',
  component,
  model: options.model ?? MODEL,
  accepts,
  props: options.props ?? {},
});

const sourceOf = (
  editor: NuiTableColumnEditor<unknown>,
  registry: NuiControlRegistry | null,
): EditorSource | NuiTableEditRefusalReason => {
  if (typeof editor !== 'string' && 'kind' in editor) {
    return editor;
  }
  const request: NuiTableControlEditor = typeof editor === 'string' ? { control: editor } : editor;
  const entry = registry?.[request.control];
  const props = request.props ?? {};

  if (entry === undefined) {
    return 'control';
  }
  return entry.props(props)
    ? { component: entry.component, model: entry.model, accepts: entry.accepts, props }
    : 'props';
};

export const editorPlan = <T>(
  column: NuiTableColumn<T>,
  value: NuiTableCellValue,
  registry: NuiControlRegistry | null,
  locale: string,
): TableEditorPlan => {
  const conversion = CONVERSIONS[column.type];

  if (column.editor === undefined) {
    return column.type === NuiTableColumnType.Boolean
      ? TOGGLE
      : { kind: 'editor', spec: { ...builtinOf(column.type, locale), ...conversion } };
  }
  const source = sourceOf(column.editor, registry);

  if (typeof source === 'string') {
    return { kind: 'refused', reason: source };
  }
  const { component, model, props } = source;

  return value === null || source.accepts(conversion.toControl(value))
    ? { kind: 'editor', spec: { component, model, props, ...conversion } }
    : { kind: 'refused', reason: 'value' };
};
