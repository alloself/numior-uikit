import { MAX_COLS, containsCell, rangeOf } from '../address';
import type { CellRange, CellValue } from '../cell.types';
import type { FormulaLocale, FormulaParse } from '../formula/formula.types';
import { EN_FORMULAS } from '../formula/locale';
import { parseFormula } from '../formula/parser';
import { formulaReferences, type FormulaReference } from '../formula/references';
import { numberValue } from '../values';
import type { Sheet, Workbook } from '../workbook';
import type {
  FormulaCell,
  FunctionRegistry,
  Limitation,
  RecalcOptions,
  Recalculation,
} from './calc.types';
import { lookupKey } from './coerce';
import { evaluateFormula, lineRange, type EvalContext } from './evaluate';
import { BASE_FUNCTIONS, createFunctionRegistry } from './functions';
import {
  colOfKey,
  createDependencyGraph,
  formulaKey,
  planRecalc,
  rowOfKey,
  type Precedent,
} from './graph';

export interface Calculator {
  setFormula(
    sheet: Sheet,
    row: number,
    col: number,
    text: string,
    locale?: FormulaLocale,
  ): FormulaParse;
  setValue(sheet: Sheet, row: number, col: number, value: CellValue): void;
  formulaAt(sheet: Sheet, row: number, col: number): FormulaCell | undefined;
  recalculate(options?: RecalcOptions): Recalculation;
  readonly pending: number;
  readonly limitations: readonly Limitation[];
}

export interface CalculatorOptions {
  readonly functions?: FunctionRegistry | undefined;
}

interface FormulaRecord {
  readonly cell: FormulaCell;
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
}

interface Run {
  readonly queue: readonly number[];
  readonly cycles: ReadonlySet<number>;
  readonly budget: number;
  done: number;
  cancelled: boolean;
}

interface LookupIndex {
  readonly version: number;
  readonly rows: Map<string, number>;
}

const DEFAULT_BUDGET = 8;

const CHECK_EVERY = 32;

const BASE_REGISTRY = createFunctionRegistry(BASE_FUNCTIONS);

const nextTask = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const referenceRange = (found: Exclude<FormulaReference, { readonly kind: 'name' }>): CellRange => {
  switch (found.kind) {
    case 'range':
      return rangeOf(found.from, found.to);
    case 'columns':
    case 'rows':
      return lineRange(found);
    default:
      return rangeOf(found.ref, found.ref);
  }
};

const oneCell = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

const precedentsOf = (record: FormulaRecord, workbook: Workbook): Precedent[] =>
  formulaReferences(record.cell.ast).flatMap((found) => {
    if (found.kind === 'name') {
      return [];
    }
    const target = found.sheet === undefined ? record.sheet : workbook.sheet(found.sheet);

    return target === undefined ? [] : [{ sheet: target.id, range: referenceRange(found) }];
  });

const indexColumn = (sheet: Sheet, range: CellRange, version: number): LookupIndex => {
  const rows = new Map<string, number>();

  sheet.cells.forEachInRange(range, (row, _col, value) => {
    const key = lookupKey(value);

    if (key !== undefined && !rows.has(key)) {
      rows.set(key, row - range.top);
    }
  });

  return { version, rows };
};

export const createCalculator = (
  workbook: Workbook,
  { functions = BASE_REGISTRY }: CalculatorOptions = {},
): Calculator => {
  const graph = createDependencyGraph();
  const formulas = new Map<number, FormulaRecord>();
  const pending = new Set<number>();
  const versions = new Map<number, number>();
  const lookups = new Map<string, LookupIndex>();
  const unknown = new Set<string>();
  const contexts = new Map<Sheet, EvalContext>();
  let current: Run | undefined;

  const columnVersion = (sheet: Sheet, col: number): number =>
    versions.get(sheet.id * MAX_COLS + col) ?? 0;

  const write = (sheet: Sheet, row: number, col: number, value: CellValue): void => {
    sheet.cells.set(row, col, value);
    versions.set(sheet.id * MAX_COLS + col, columnVersion(sheet, col) + 1);
  };

  const lookup = (sheet: Sheet, range: CellRange, wanted: CellValue): number | undefined => {
    const key = lookupKey(wanted);
    const id = `${String(sheet.id)}:${String(range.top)}:${String(range.bottom)}:${String(range.left)}`;
    const version = columnVersion(sheet, range.left);
    const known = lookups.get(id);
    const index = known?.version === version ? known : indexColumn(sheet, range, version);

    lookups.set(id, index);
    return key === undefined ? undefined : index.rows.get(key);
  };

  const contextFor = (sheet: Sheet): EvalContext => {
    const known = contexts.get(sheet);

    if (known !== undefined) {
      return known;
    }

    const context: EvalContext = {
      workbook,
      sheet,
      functions,
      lookup,
      unknown: (name) => unknown.add(name),
    };

    contexts.set(sheet, context);
    return context;
  };

  const interrupt = (): void => {
    if (current !== undefined) {
      current.cancelled = true;
    }
  };

  const compute = (key: number, cycles: ReadonlySet<number>): void => {
    const record = formulas.get(key);

    if (record === undefined || !pending.delete(key)) {
      return;
    }
    if (cycles.has(key)) {
      record.cell.state = 'cycle';
      write(record.sheet, record.row, record.col, numberValue(0));
      return;
    }

    write(
      record.sheet,
      record.row,
      record.col,
      evaluateFormula(record.cell.ast, contextFor(record.sheet)),
    );

    record.cell.state = 'fresh';
  };

  const step = (run: Run): boolean => {
    const started = performance.now();

    while (run.done < run.queue.length && !run.cancelled) {
      compute(run.queue[run.done] ?? -1, run.cycles);
      run.done += 1;
      if (run.done % CHECK_EVERY === 0 && performance.now() - started > run.budget) {
        return run.done >= run.queue.length;
      }
    }
    return true;
  };

  const proceed = (run: Run, yieldTo: () => Promise<void>): Promise<void> =>
    yieldTo().then(() => (step(run) || run.cancelled ? undefined : proceed(run, yieldTo)));

  const visible = (key: number, viewport: NonNullable<RecalcOptions['viewport']>): boolean => {
    const record = formulas.get(key);

    return record?.sheet === viewport.sheet && containsCell(viewport.range, record.row, record.col);
  };

  const ancestors = (order: readonly number[], seeds: number[]): Set<number> => {
    const planned = new Set(order);
    const needed = new Set<number>();

    const inside = (precedent: Precedent): number[] =>
      order.filter(
        (key) =>
          formulas.get(key)?.sheet.id === precedent.sheet &&
          containsCell(precedent.range, rowOfKey(key), colOfKey(key)),
      );

    for (let key = seeds.pop(); key !== undefined; key = seeds.pop()) {
      if (!needed.has(key)) {
        needed.add(key);

        graph.precedentsOf(key).forEach((precedent) => {
          const direct = formulaKey(precedent.sheet, precedent.range.top, precedent.range.left);
          const found = oneCell(precedent.range) ? [direct] : inside(precedent);

          seeds.push(...found.filter((candidate) => planned.has(candidate)));
        });
      }
    }
    return needed;
  };

  const prioritised = (order: readonly number[], viewport: RecalcOptions['viewport']) => {
    if (viewport === undefined) {
      return order;
    }

    const needed = ancestors(
      order,
      order.filter((key) => visible(key, viewport)),
    );

    return [...order.filter((key) => needed.has(key)), ...order.filter((key) => !needed.has(key))];
  };

  return {
    setFormula: (sheet, row, col, text, locale = EN_FORMULAS) => {
      const parsed = parseFormula(text, locale);

      if (!parsed.ok) {
        return parsed;
      }
      const key = formulaKey(sheet.id, row, col);

      const record: FormulaRecord = {
        cell: { text, ast: parsed.ast, state: 'stale' },
        sheet,
        row,
        col,
      };

      interrupt();
      formulas.set(key, record);
      graph.set(key, precedentsOf(record, workbook));
      pending.add(key);
      return parsed;
    },
    setValue: (sheet, row, col, value) => {
      const key = formulaKey(sheet.id, row, col);

      interrupt();
      if (formulas.delete(key)) {
        graph.remove(key);
        pending.delete(key);
      }
      write(sheet, row, col, value);
      graph.forEachDependent(sheet.id, row, col, (dependent) => pending.add(dependent));
    },
    formulaAt: (sheet, row, col) => formulas.get(formulaKey(sheet.id, row, col))?.cell,
    recalculate: (options = {}) => {
      interrupt();
      const plan = planRecalc(pending, graph);

      plan.order.forEach((key) => {
        const record = formulas.get(key);

        pending.add(key);
        if (record !== undefined) {
          record.cell.state = 'stale';
        }
      });

      const run: Run = {
        queue: prioritised(plan.order, options.viewport),
        cycles: plan.cycles,
        budget: options.budgetMs ?? DEFAULT_BUDGET,
        done: 0,
        cancelled: false,
      };

      current = run;
      const settled = step(run) ? Promise.resolve() : proceed(run, options.yieldTo ?? nextTask);

      return {
        total: run.queue.length,
        get done() {
          return run.done;
        },
        settled,
        cancel: () => {
          run.cancelled = true;
        },
      };
    },
    get pending() {
      return pending.size;
    },
    get limitations() {
      return [...unknown].map((name): Limitation => ({ kind: 'function', name }));
    },
  };
};
