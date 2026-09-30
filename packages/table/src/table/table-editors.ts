import { formatIsoDate, parseIsoDate } from '@numior/primitives';
import { NuiDatePicker, NuiInput, NuiNumberField } from '@numior/vue';
import { instantOf } from './table-format';
import type {
  NuiTableBooleanColumn,
  NuiTableCellValue,
  NuiTableColumn,
  TableCellEditorSpec,
} from './table.types';

const MODEL = 'modelValue';

const isoOf = (value: NuiTableCellValue): string | null => {
  const time = instantOf(value);

  if (Number.isNaN(time)) {
    return null;
  }
  const date = new Date(time);

  return formatIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
};

const dateOf = (value: unknown): Date | null => {
  const parts = typeof value === 'string' ? parseIsoDate(value) : null;

  return parts === null ? null : new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
};

const textEditor: TableCellEditorSpec = {
  component: NuiInput,
  model: MODEL,
  props: {},
  toControl: (value) => (typeof value === 'string' ? value : ''),
  fromControl: (value) => (typeof value === 'string' && value !== '' ? value : null),
};

export const builtinEditor = <T>(
  column: Exclude<NuiTableColumn<T>, NuiTableBooleanColumn<T>>,
  locale: string,
): TableCellEditorSpec => {
  switch (column.type) {
    case 'text':
      return textEditor;
    case 'number':
      return {
        component: NuiNumberField,
        model: MODEL,
        props: { locale, steppers: false },
        toControl: (value) => (typeof value === 'number' ? value : null),
        fromControl: (value) => (typeof value === 'number' ? value : null),
      };
    case 'date':
      return {
        component: NuiDatePicker,
        model: MODEL,
        props: { locale },
        toControl: isoOf,
        fromControl: dateOf,
      };
  }
};
