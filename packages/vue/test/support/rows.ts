import type { NuiTableColumn } from '../../src';
import {
  isDate,
  isNumber,
  isString,
  listOf,
  nullable,
  optional,
  shapeOf,
  type Guard,
} from '../../../primitives/test/support/guards';

export interface Person {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly age: number;
  readonly joined: Date;
  readonly score: number | null;
  readonly children?: readonly Person[] | undefined;
}

const person = (
  id: number,
  name: string,
  role: string,
  age: number,
  joined: string,
  score: number | null,
): Person => ({ id, name, role, age, joined: new Date(joined), score });

export const PEOPLE: readonly Person[] = [
  person(1, 'Анна', 'Дизайн', 34, '2021-03-01', 88),
  person(2, 'Борис', 'Разработка', 28, '2022-07-15', null),
  person(3, 'Вера', 'Разработка', 45, '2019-01-20', 92),
  person(4, 'Глеб', 'Тесты', 23, '2023-05-02', 71),
  person(5, 'Дина', 'Дизайн', 39, '2020-11-11', 65),
  person(6, 'Егор', 'Разработка', 31, '2021-09-09', 79),
  person(7, 'Жанна', 'Поддержка', 52, '2018-02-28', 84),
  person(8, 'Зоя', 'Тесты', 27, '2022-12-01', null),
  person(9, 'Иван', 'Разработка', 41, '2017-06-06', 95),
  person(10, 'Кира', 'Дизайн', 36, '2020-04-14', 58),
  person(11, 'Лев', 'Поддержка', 29, '2023-01-30', 77),
  person(12, 'Мария', 'Разработка', 48, '2016-10-10', 90),
];

export const COLUMNS: readonly NuiTableColumn<unknown>[] = [
  { key: 'name', label: 'Имя', sortable: true },
  { key: 'role', label: 'Роль' },
  { key: 'age', label: 'Возраст', sortable: true, align: 'end', width: '6rem' },
  { key: 'score', label: 'Балл', sortable: true, align: 'end' },
];

export const manyPeople = (count: number): Person[] =>
  Array.from({ length: count }, (_, index) =>
    person(
      index + 1,
      `Сотрудник ${index + 1}`,
      'Разработка',
      20 + (index % 40),
      '2020-01-01',
      index,
    ),
  );

export const TEAM: readonly Person[] = [
  {
    ...person(1, 'Анна', 'Дизайн', 34, '2021-03-01', 88),
    children: [
      person(11, 'Айгуль', 'Дизайн', 26, '2023-01-01', 70),
      {
        ...person(12, 'Артём', 'Дизайн', 31, '2022-01-01', 75),
        children: [person(121, 'Ася', 'Дизайн', 22, '2024-01-01', 60)],
      },
    ],
  },
  person(2, 'Борис', 'Разработка', 28, '2022-07-15', null),
  person(3, 'Вера', 'Разработка', 45, '2019-01-20', 92),
];

export const childrenOf = (row: unknown): readonly Person[] | undefined =>
  isPerson(row) ? row.children : undefined;

export const expandableTeam = (row: unknown): boolean =>
  isPerson(row) && (row.id === 3 || (row.children?.length ?? 0) > 0);

export const withChildren = (
  rows: readonly Person[],
  id: number,
  children: readonly Person[],
): Person[] =>
  rows.map((row) => ({
    ...row,
    ...(row.id === id ? { children } : {}),
    ...(row.children ? { children: withChildren(row.children, id, children) } : {}),
  }));

export const newcomer = person(31, 'Влад', 'Разработка', 24, '2025-01-01', 66);

const isPersonShape = shapeOf({
  id: isNumber,
  name: isString,
  role: isString,
  age: isNumber,
  joined: isDate,
  score: nullable(isNumber),
  children: optional(listOf((value: unknown): value is Person => isPerson(value))),
});

export const isPerson: Guard<Person> = (value): value is Person => isPersonShape(value);
