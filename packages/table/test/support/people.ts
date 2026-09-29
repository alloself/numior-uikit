import type { NuiTableColumn } from '../../src';

export interface Person {
  readonly id: number;
  readonly name: string;
  readonly city: string | null;
  readonly salary: number | null;
  readonly hired: Date | null;
  readonly remote: boolean | null;
  readonly note: string;
  readonly team: string;
  readonly metrics: readonly number[];
}

const CITIES = ['Москва', 'Казань', null, 'Ереван'] as const;
const TEAMS = ['Платформа', 'Данные', 'Дизайн'] as const;
const METRICS = 10;

export const people = (count: number): Person[] =>
  Array.from({ length: count }, (_, id) => ({
    id,
    name: `Сотрудник ${id}`,
    city: CITIES[id % CITIES.length] ?? null,
    salary: id % 5 === 4 ? null : 1_000_000 + id * 1234.5,
    hired: id % 7 === 6 ? null : new Date(Date.UTC(2020, id % 12, 1 + (id % 28))),
    remote: id % 3 === 2 ? null : id % 3 === 0,
    note: `Заметка ${id}`,
    team: TEAMS[id % TEAMS.length] ?? '',
    metrics: Array.from(Array.from({ length: METRICS }).keys(), (metric) => id * 10 + metric),
  }));

const metricColumns: NuiTableColumn<Person>[] = Array.from({ length: METRICS }, (_, metric) => ({
  key: `m${metric + 1}`,
  label: `M${metric + 1}`,
  type: 'number',
  width: 100,
  value: (row) => row.metrics[metric],
}));

export const PEOPLE_COLUMNS: readonly NuiTableColumn<Person>[] = [
  { key: 'id', label: 'ID', type: 'number', pin: 'start', width: 80, value: (row) => row.id },
  { key: 'name', label: 'Имя', type: 'text', width: 160, value: (row) => row.name },
  { key: 'city', label: 'Город', type: 'text', width: 140, value: (row) => row.city },
  { key: 'salary', label: 'Оклад', type: 'number', width: 120, value: (row) => row.salary },
  { key: 'hired', label: 'Нанят', type: 'date', width: 140, value: (row) => row.hired },
  { key: 'remote', label: 'Удалённо', type: 'boolean', width: 100, value: (row) => row.remote },
  { key: 'note', label: 'Заметка', type: 'text', width: 200, value: (row) => row.note },
  ...metricColumns,
  { key: 'team', label: 'Команда', type: 'text', pin: 'end', width: 120, value: (row) => row.team },
];
