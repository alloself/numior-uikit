import { promiseTimeout } from '@vueuse/core';
import {
  createTableEngine,
  type TableEngine,
  type TableEngineColumn,
  type TableNode,
  type TableNodeId,
  type TableProgress,
  type TableQuery,
  type TableRunResult,
} from '../../src/engine';

export interface Person {
  readonly name: string | null;
  readonly age: number | null;
  readonly born: Date | null;
  readonly active: boolean | null;
}

export interface Order {
  readonly id: number;
  readonly city: string | null;
  readonly country: string;
  readonly amount: number | null;
  readonly paid: boolean | null;
  readonly created: Date | null;
  readonly note: string | null;
}

export interface Folder {
  readonly name: string;
  readonly size: number | null;
  readonly items?: readonly Folder[];
}

export interface EngineHarnessOptions<T> {
  readonly sliceMs?: number;
  readonly keyOf?: (row: T) => TableNodeId;
  readonly children?: (row: T) => readonly T[] | null | undefined;
  readonly hasChildren?: (row: T) => boolean;
  readonly detail?: (row: T) => boolean;
  readonly defaultExpanded?: boolean;
}

export const PEOPLE_COLUMNS: readonly TableEngineColumn<Person>[] = [
  { kind: 'string', key: 'name', value: (row) => row.name },
  { kind: 'number', key: 'age', value: (row) => row.age },
  { kind: 'date', key: 'born', value: (row) => row.born },
  { kind: 'boolean', key: 'active', value: (row) => row.active },
];

export const PEOPLE: readonly Person[] = [
  { name: 'Вера', age: 41, born: new Date('1984-03-02'), active: true },
  { name: 'анна', age: null, born: new Date('1990-07-15'), active: false },
  { name: 'Борис', age: 29, born: null, active: null },
  { name: null, age: 29, born: new Date('1996-01-20'), active: true },
  { name: 'Анна', age: 35, born: new Date('1990-07-15'), active: false },
];

export const ORDERS: readonly Order[] = [
  {
    id: 1,
    city: 'Moscow',
    country: 'RU',
    amount: 100,
    paid: true,
    created: new Date('2024-01-05'),
    note: 'urgent',
  },
  {
    id: 2,
    city: 'Kazan',
    country: 'RU',
    amount: 250,
    paid: false,
    created: new Date('2024-02-10'),
    note: null,
  },
  { id: 3, city: 'Yerevan', country: 'AM', amount: null, paid: null, created: null, note: '' },
  {
    id: 4,
    city: 'Moscow',
    country: 'RU',
    amount: 75,
    paid: true,
    created: new Date('2024-03-15'),
    note: 'Gift',
  },
  {
    id: 5,
    city: null,
    country: 'KZ',
    amount: 300,
    paid: false,
    created: new Date('2023-12-31'),
    note: 'gift wrap',
  },
  {
    id: 6,
    city: 'Almaty',
    country: 'KZ',
    amount: 120,
    paid: true,
    created: new Date('2024-01-20'),
    note: 'URGENT call',
  },
];

export const ORDER_COLUMNS: readonly TableEngineColumn<Order>[] = [
  { kind: 'number', key: 'id', value: (row) => row.id },
  { kind: 'string', key: 'city', value: (row) => row.city },
  { kind: 'string', key: 'country', value: (row) => row.country },
  { kind: 'number', key: 'amount', value: (row) => row.amount },
  { kind: 'boolean', key: 'paid', value: (row) => row.paid },
  { kind: 'date', key: 'created', value: (row) => row.created },
  { kind: 'string', key: 'note', value: (row) => row.note },
];

export const ORDER_TOTALS: readonly TableEngineColumn<Order>[] = [
  { kind: 'number', key: 'id', value: (row) => row.id, aggregate: 'count' },
  { kind: 'string', key: 'city', value: (row) => row.city },
  { kind: 'string', key: 'country', value: (row) => row.country },
  { kind: 'number', key: 'amount', value: (row) => row.amount, aggregate: 'sum' },
  { kind: 'number', key: 'average', value: (row) => row.amount, aggregate: 'avg' },
  { kind: 'number', key: 'largest', value: (row) => row.amount, aggregate: 'max' },
  {
    kind: 'string',
    key: 'note',
    value: (row) => row.note,
    aggregate: (rows, indices) =>
      Array.from(indices, (index) => rows[index]?.note ?? '·').join('|'),
  },
];

export const FOLDERS: readonly Folder[] = [
  {
    name: 'docs',
    size: null,
    items: [
      { name: 'plan.md', size: 3 },
      { name: 'adr.md', size: 5 },
      { name: 'old', size: null, items: [{ name: 'notes.txt', size: 1 }] },
    ],
  },
  {
    name: 'src',
    size: null,
    items: [
      { name: 'index.ts', size: 8 },
      { name: 'app.vue', size: 13 },
    ],
  },
  { name: 'readme.md', size: 2 },
];

export const FOLDER_COLUMNS: readonly TableEngineColumn<Folder>[] = [
  { kind: 'string', key: 'name', value: (row) => row.name },
  { kind: 'number', key: 'size', value: (row) => row.size },
];

const tick = (): Promise<void> => promiseTimeout(0);

export class EngineHarness<T> {
  readonly engine: TableEngine<T>;
  readonly progress: TableProgress[] = [];
  private readonly waiting: Array<() => void> = [];
  private yields = 0;

  constructor(
    columns: readonly TableEngineColumn<T>[],
    rows: readonly T[],
    options: EngineHarnessOptions<T> = {},
  ) {
    this.engine = createTableEngine({
      columns,
      keyOf: options.keyOf,
      children: options.children,
      hasChildren: options.hasChildren,
      detail: options.detail,
      defaultExpanded: options.defaultExpanded,
      sliceMs: options.sliceMs ?? 12,
      collator: new Intl.Collator('ru', { numeric: true }),
      yieldTo: () => {
        this.yields += 1;
        return new Promise((resolve) => {
          this.waiting.push(resolve);
        });
      },
    });

    this.engine.setRows(rows);
  }

  get pendingYields(): number {
    return this.waiting.length;
  }

  get slices(): number {
    return this.yields;
  }

  get phases(): string[] {
    return [...new Set(this.progress.map((entry) => entry.phase))];
  }

  run(query: TableQuery, signal?: AbortSignal): Promise<TableRunResult> {
    return this.engine.run(query, {
      signal,
      onProgress: (progress) => {
        this.progress.push(progress);
      },
    });
  }

  async step(): Promise<void> {
    const resume = this.waiting.shift();

    resume?.();
    await tick();
  }

  async settle<R>(pending: Promise<R>): Promise<R> {
    const outcome = { settled: false };

    const finish = (): void => {
      this.yields += 1;
      outcome.settled = true;
    };

    pending.then(finish, finish);

    while (!outcome.settled) {
      await this.step();
    }
    return pending;
  }

  runToEnd(query: TableQuery): Promise<TableRunResult> {
    return this.settle(this.run(query));
  }

  nodes(): TableNode<T>[] {
    const list: TableNode<T>[] = [];

    for (let position = 0; position < this.engine.count(); position += 1) {
      const node = this.engine.nodeAt(position);

      if (node !== undefined) {
        list.push(node);
      }
    }
    return list;
  }

  visible<K extends keyof T>(field: K): T[K][] {
    return this.nodes().flatMap((node) => (node.kind === 'row' ? [node.row[field]] : []));
  }

  render(label: (node: TableNode<T>) => string): string[] {
    return this.nodes().map(label);
  }
}
