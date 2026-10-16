import { isString } from '@numior/primitives';
import { tableEditor, type NuiTableColumn } from '@numior/table';
import { NuiCombobox } from '@numior/vue';
import type {
  NuiContentCellValue,
  NuiContentTableColumn,
  NuiContentTableRow,
} from '../content/content.types';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/u;

const MIN_WIDTH = 96;

const cellAt = (row: NuiContentTableRow, index: number): NuiContentCellValue =>
  row.cells[index] ?? null;

const textAt = (row: NuiContentTableRow, index: number): string | null => {
  const value = cellAt(row, index);

  return typeof value === 'string' ? value : null;
};

const numberAt = (row: NuiContentTableRow, index: number): number | null => {
  const value = cellAt(row, index);

  return typeof value === 'number' ? value : null;
};

const booleanAt = (row: NuiContentTableRow, index: number): boolean | null => {
  const value = cellAt(row, index);

  return typeof value === 'boolean' ? value : null;
};

const dayAt = (row: NuiContentTableRow, index: number): number | null => {
  const parts = ISO.exec(textAt(row, index) ?? '');

  return parts === null ? null : Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
};

const keepText = (text: string): string => text;

const selectEditor = (column: NuiContentTableColumn) =>
  tableEditor(NuiCombobox, isString, {
    props: {
      options: column.options.map((option) => ({ value: option, label: option })),
      customValue: keepText,
    },
  });

export const contentTableColumns = (
  columns: readonly NuiContentTableColumn[],
  editable: boolean,
): NuiTableColumn<NuiContentTableRow>[] =>
  columns.map((column, index): NuiTableColumn<NuiContentTableRow> => {
    const base = {
      key: column.id,
      label: column.name,
      width: column.width,
      minWidth: MIN_WIDTH,
      editable,
      sortable: editable,
      resizable: editable,
      reorderable: editable,
      hideable: editable,
      ...(editable ? {} : { filter: false as const }),
    };

    switch (column.type) {
      case 'number':
        return { ...base, type: 'number', value: (row) => numberAt(row, index) };
      case 'date':
        return { ...base, type: 'date', value: (row) => dayAt(row, index) };
      case 'boolean':
        return { ...base, type: 'boolean', value: (row) => booleanAt(row, index) };
      case 'select':
        return {
          ...base,
          type: 'text',
          filter: editable ? 'set' : false,
          value: (row) => textAt(row, index),
          editor: editable ? selectEditor(column) : undefined,
        };
      case 'text':
        return { ...base, type: 'text', wrap: true, value: (row) => textAt(row, index) };
    }
  });
