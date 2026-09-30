import type { NuiTableColumn, NuiTableEdit } from '../../src';

export interface Staff {
  readonly id: number;
  name: string;
  city: string | null;
  salary: number | null;
  remote: boolean | null;
}

const CITIES = ['Москва', 'Казань', 'Ереван'] as const;

export const staff = (count: number): Staff[] =>
  Array.from({ length: count }, (_, id) => ({
    id,
    name: `Сотрудник ${id}`,
    city: CITIES[id % CITIES.length] ?? null,
    salary: 1000 + id * 10,
    remote: id % 2 === 0,
  }));

export const STAFF_COLUMNS: readonly NuiTableColumn<Staff>[] = [
  { key: 'id', label: 'ID', type: 'number', width: 80, value: (row) => row.id },
  { key: 'name', label: 'Имя', type: 'text', width: 160, value: (row) => row.name },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 140,
    editable: true,
    value: (row) => row.city,
  },
  {
    key: 'salary',
    label: 'Оклад',
    type: 'number',
    width: 120,
    editable: (row) => row.id !== 0,
    aggregate: 'sum',
    value: (row) => row.salary,
  },
  {
    key: 'remote',
    label: 'Удалённо',
    type: 'boolean',
    width: 100,
    editable: true,
    value: (row) => row.remote,
  },
];

export const applyStaffEdits = (changes: readonly NuiTableEdit<Staff>[]): void => {
  for (const { row, key, value } of changes) {
    switch (key) {
      case 'city':
        row.city = typeof value === 'string' ? value : null;
        break;
      case 'salary':
        row.salary = typeof value === 'number' ? value : null;
        break;
      case 'remote':
        row.remote = typeof value === 'boolean' ? value : null;
        break;
      default:
        break;
    }
  }
};
