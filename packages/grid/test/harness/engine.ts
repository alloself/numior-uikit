import {
  createGridEngine,
  type GridEngine,
  type GridEngineColumn,
  type GridProgress,
  type GridQuery,
  type GridRunResult,
} from '../../src/engine';

export interface Person {
  readonly name: string | null;
  readonly age: number | null;
  readonly born: Date | null;
  readonly active: boolean | null;
}

export const PEOPLE_COLUMNS: readonly GridEngineColumn<Person>[] = [
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

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

export interface EngineHarnessOptions {
  readonly sliceMs?: number;
}

export class EngineHarness<T> {
  readonly engine: GridEngine<T>;
  readonly progress: GridProgress[] = [];
  private readonly waiting: Array<() => void> = [];

  constructor(
    columns: readonly GridEngineColumn<T>[],
    rows: readonly T[],
    options: EngineHarnessOptions = {},
  ) {
    this.engine = createGridEngine({
      columns,
      sliceMs: options.sliceMs ?? 12,
      collator: new Intl.Collator('ru', { numeric: true }),
      yieldTo: () =>
        new Promise((resolve) => {
          this.waiting.push(resolve);
        }),
    });

    this.engine.setRows(rows);
  }

  get pendingYields(): number {
    return this.waiting.length;
  }

  get phases(): string[] {
    return [...new Set(this.progress.map((entry) => entry.phase))];
  }

  run(query: GridQuery, signal?: AbortSignal): Promise<GridRunResult> {
    return this.engine.run(query, {
      signal,
      onProgress: (progress) => {
        this.progress.push(progress);
      },
    });
  }

  async step(): Promise<void> {
    this.waiting.shift()?.();
    await tick();
  }

  async settle<R>(pending: Promise<R>): Promise<R> {
    const outcome = { settled: false };

    const finish = (): void => {
      outcome.settled = true;
    };

    pending.then(finish, finish);

    while (!outcome.settled) {
      await this.step();
    }
    return pending;
  }

  async runToEnd(query: GridQuery): Promise<GridRunResult> {
    return this.settle(this.run(query));
  }

  visible<K extends keyof T>(field: K): T[K][] {
    const values: T[K][] = [];

    for (let position = 0; position < this.engine.count(); position += 1) {
      const node = this.engine.nodeAt(position);

      if (node !== undefined) {
        values.push(node.row[field]);
      }
    }
    return values;
  }
}
