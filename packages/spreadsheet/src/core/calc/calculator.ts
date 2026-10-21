import { MAX_COLS, MAX_ROWS, containsCell, rangeOf } from '../address';
import type { CellRange, CellValue } from '../cell.types';
import type { FormulaLocale, FormulaNode, FormulaParse } from '../formula/formula.types';
import { EN_LOCALE, type BookLocale } from '../locale';
import { parseFormula } from '../formula/parser';
import { formulaReferences, type FormulaReference } from '../formula/references';
import { EMPTY, errorValue, numberValue } from '../values';
import type { Sheet, Workbook } from '../workbook';
import type {
  ArrayValue,
  FormulaCell,
  FormulaResult,
  FunctionRegistry,
  Limitation,
  RecalcOptions,
  Recalculation,
} from './calc.types';
import { lookupKey } from './coerce';
import { evaluateFormula, lineRange, type EvalContext } from './evaluate';
import { BASE_FUNCTIONS } from './functions';
import {
  colOfKey,
  createDependencyGraph,
  formulaKey,
  planRecalc,
  rowOfKey,
  type Precedent,
} from './graph';
import { createFunctionRegistry } from './registry';
import { createSpills, forEachSpillCell, type SpillArea, type SpillCell } from './spills';

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
  spillOf(sheet: Sheet, row: number, col: number): CellRange | undefined;
  recalculate(options?: RecalcOptions): Recalculation;
  setLocale(locale: BookLocale): void;
  readonly locale: BookLocale;
  readonly pending: number;
  readonly limitations: readonly Limitation[];
}

export interface CalculatorOptions {
  readonly functions?: FunctionRegistry | undefined;
  readonly clock?: (() => Date) | undefined;
  readonly random?: (() => number) | undefined;
  readonly locale?: BookLocale | undefined;
}

interface FormulaRecord {
  readonly cell: FormulaCell;
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
  readonly precedents: readonly Precedent[];
  dynamic: boolean;
}

interface Run {
  queue: readonly number[];
  cycles: ReadonlySet<number>;
  readonly budget: number;
  index: number;
  done: number;
  total: number;
  passes: number;
  busy: number;
  cancelled: boolean;
}

interface LookupIndex {
  readonly version: number;
  readonly rows: Map<string, number>;
}

const DEFAULT_BUDGET = 8;

const CHECK_EVERY = 32;

const MAX_PASSES = 16;

const SMALL_AREA = 4096;

const DAY_MS = 86_400_000;

const SERIAL_EPOCH = Date.UTC(1899, 11, 30);

const BASE_REGISTRY = createFunctionRegistry(BASE_FUNCTIONS);

const SPILL_ERROR = errorValue('#SPILL!');

const nextTask = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof MessageChannel === 'undefined') {
      setTimeout(resolve, 0);
      return;
    }
    const channel = new MessageChannel();

    channel.port1.addEventListener(
      'message',
      () => {
        channel.port1.close();
        resolve();
      },
      { once: true },
    );

    channel.port1.start();
    channel.port2.postMessage(null);
  });

const serialOf = (date: Date): number =>
  (Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  ) -
    SERIAL_EPOCH) /
  DAY_MS;

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

const precedentsOf = (
  record: Pick<FormulaRecord, 'cell' | 'sheet'>,
  workbook: Workbook,
): Precedent[] =>
  formulaReferences(record.cell.ast).flatMap((found) => {
    if (found.kind === 'name') {
      return [];
    }
    const target = found.sheet === undefined ? record.sheet : workbook.sheet(found.sheet);

    return target === undefined ? [] : [{ sheet: target.id, range: referenceRange(found) }];
  });

const usesVolatile = (node: FormulaNode, functions: FunctionRegistry): boolean => {
  switch (node.kind) {
    case 'call':
      return (
        functions.get(node.name)?.volatile === true ||
        node.args.some((arg) => usesVolatile(arg, functions))
      );
    case 'unary':
    case 'percent':
      return usesVolatile(node.operand, functions);
    case 'binary':
      return usesVolatile(node.left, functions) || usesVolatile(node.right, functions);
    default:
      return false;
  }
};

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

const spillArea = (record: FormulaRecord, result: ArrayValue): SpillArea => ({
  sheet: record.sheet,
  range: {
    top: record.row,
    left: record.col,
    bottom: record.row + result.rows.length - 1,
    right: record.col + (result.rows[0]?.length ?? 1) - 1,
  },
});

const insideSheet = (range: CellRange): boolean =>
  range.bottom < MAX_ROWS && range.right < MAX_COLS;

export const createCalculator = (
  workbook: Workbook,
  {
    functions = BASE_REGISTRY,
    clock = () => new Date(),
    random = Math.random,
    locale: initialLocale = EN_LOCALE,
  }: CalculatorOptions = {},
): Calculator => {
  const graph = createDependencyGraph();
  const spills = createSpills();
  const formulas = new Map<number, FormulaRecord>();
  const pending = new Set<number>();
  const volatiles = new Set<number>();
  const versions = new Map<number, number>();
  const lookups = new Map<string, LookupIndex>();
  const unknown = new Set<string>();
  const contexts = new Map<Sheet, EvalContext>();
  let current: Run | undefined;
  let locale = initialLocale;
  let now = 0;
  let evaluating: FormulaRecord | undefined;
  const dynamic: Precedent[] = [];

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
      locale: locale.numbers,
      lookup,
      unknown: (name) => unknown.add(name),
      spillRange: (target, row, col) => spills.areaOf(formulaKey(target.id, row, col))?.range,
      now: () => now,
      random,
      here: () => ({
        sheet: evaluating?.sheet ?? sheet,
        row: evaluating?.row ?? 0,
        col: evaluating?.col ?? 0,
      }),
      track: (target, range) => {
        dynamic.push({ sheet: target.id, range });
      },
    };

    contexts.set(sheet, context);
    return context;
  };

  const interrupt = (): void => {
    if (current !== undefined) {
      current.cancelled = true;
    }
  };

  const touch = (cell: SpillCell): void => {
    graph.forEachDependent(cell.sheet.id, cell.row, cell.col, (dependent) =>
      pending.add(dependent),
    );

    spills.waiting(cell.sheet, cell.row, cell.col, (anchor) => pending.add(anchor));
  };

  const release = (key: number): void => {
    spills.release(key, (cell) => {
      write(cell.sheet, cell.row, cell.col, EMPTY);
      touch(cell);
    });
  };

  const occupied = (area: SpillArea): boolean => {
    let taken = false;

    forEachSpillCell(area, (cell, key) => {
      taken ||= cell.sheet.cells.has(cell.row, cell.col) || formulas.has(key) || spills.owns(key);
    });

    return taken;
  };

  const readsOwnArea = (key: number, area: SpillArea): boolean => {
    let reads = false;

    forEachSpillCell(area, (cell) => {
      graph.forEachDependent(cell.sheet.id, cell.row, cell.col, (dependent) => {
        reads ||= dependent === key;
      });
    });

    return reads;
  };

  const writeAnchor = (record: FormulaRecord, value: CellValue, cycle = false): void => {
    write(record.sheet, record.row, record.col, value);
    record.cell.state = cycle ? 'cycle' : 'fresh';
  };

  const spill = (key: number, record: FormulaRecord, result: ArrayValue): void => {
    const area = spillArea(record, result);

    if (!insideSheet(area.range) || occupied(area)) {
      spills.block(key, area);
      writeAnchor(record, SPILL_ERROR);
      return;
    }
    if (readsOwnArea(key, area)) {
      writeAnchor(record, numberValue(0), true);
      return;
    }
    spills.occupy(key, area);
    writeAnchor(record, result.rows[0]?.[0] ?? EMPTY);

    forEachSpillCell(area, (cell) => {
      write(
        cell.sheet,
        cell.row,
        cell.col,
        result.rows[cell.row - record.row]?.[cell.col - record.col] ?? EMPTY,
      );

      touch(cell);
    });
  };

  const place = (key: number, record: FormulaRecord, result: FormulaResult): void => {
    release(key);
    if (result.kind === 'array') {
      spill(key, record, result);
    } else {
      writeAnchor(record, result);
    }
  };

  const pendingInside = (precedent: Precedent): boolean => {
    const { range } = precedent;

    if ((range.bottom - range.top + 1) * (range.right - range.left + 1) > SMALL_AREA) {
      return [...pending].some(
        (key) =>
          formulas.get(key)?.sheet.id === precedent.sheet &&
          containsCell(range, rowOfKey(key), colOfKey(key)),
      );
    }
    for (let row = range.top; row <= range.bottom; row += 1) {
      for (let col = range.left; col <= range.right; col += 1) {
        if (pending.has(formulaKey(precedent.sheet, row, col))) {
          return true;
        }
      }
    }
    return false;
  };

  const settleDynamic = (key: number, record: FormulaRecord, found: Precedent[]): void => {
    if (found.length === 0 && !record.dynamic) {
      return;
    }
    record.dynamic = found.length > 0;
    graph.set(key, [...record.precedents, ...found]);
    if (found.some(pendingInside)) {
      pending.add(key);
    }
  };

  const compute = (key: number, cycles: ReadonlySet<number>): void => {
    const listed = pending.delete(key);
    const record = formulas.get(key);

    if (record === undefined || !listed) {
      return;
    }
    if (cycles.has(key)) {
      release(key);
      writeAnchor(record, numberValue(0), true);
      return;
    }
    evaluating = record;
    dynamic.length = 0;
    const result = evaluateFormula(record.cell.ast, contextFor(record.sheet));

    evaluating = undefined;
    settleDynamic(key, record, dynamic);
    place(key, record, result);
  };

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

  const plan = (viewport: RecalcOptions['viewport']) => {
    const planned = planRecalc(pending, graph);

    planned.order.forEach((key) => {
      const record = formulas.get(key);

      pending.add(key);
      if (record !== undefined) {
        record.cell.state = 'stale';
      }
    });

    return { queue: prioritised(planned.order, viewport), cycles: planned.cycles };
  };

  const replan = (run: Run): boolean => {
    if (pending.size === 0 || run.passes >= MAX_PASSES) {
      return false;
    }
    const next = plan(undefined);

    run.queue = next.queue;
    run.cycles = next.cycles;
    run.index = 0;
    run.passes += 1;
    run.total += next.queue.length;
    return true;
  };

  const slice = (run: Run, started: number): boolean => {
    while (!run.cancelled && (run.index < run.queue.length || replan(run))) {
      compute(run.queue[run.index] ?? -1, run.cycles);
      run.index += 1;
      run.done += 1;
      if (run.done % CHECK_EVERY === 0 && performance.now() - started > run.budget) {
        return false;
      }
    }
    return true;
  };

  const step = (run: Run): boolean => {
    const started = performance.now();
    const finished = slice(run, started);

    run.busy += performance.now() - started;
    return finished;
  };

  const proceed = (run: Run, yieldTo: () => Promise<void>): Promise<void> =>
    yieldTo().then(() => (step(run) || run.cancelled ? undefined : proceed(run, yieldTo)));

  const forget = (key: number): void => {
    if (formulas.delete(key)) {
      graph.remove(key);
      pending.delete(key);
      volatiles.delete(key);
      release(key);
    }
  };

  const claim = (key: number): void => {
    const owner = spills.claim(key);

    if (owner !== undefined) {
      pending.add(owner);
    }
  };

  return {
    setFormula: (sheet, row, col, text, syntax = locale.formulas) => {
      const parsed = parseFormula(text, syntax);

      if (!parsed.ok) {
        return parsed;
      }
      const key = formulaKey(sheet.id, row, col);

      const cell: FormulaCell = { text, ast: parsed.ast, state: 'stale' };

      const record: FormulaRecord = {
        cell,
        sheet,
        row,
        col,
        precedents: precedentsOf({ cell, sheet }, workbook),
        dynamic: false,
      };

      interrupt();
      claim(key);
      formulas.set(key, record);
      graph.set(key, record.precedents);
      pending.add(key);
      if (usesVolatile(parsed.ast, functions)) {
        volatiles.add(key);
      } else {
        volatiles.delete(key);
      }
      return parsed;
    },
    setValue: (sheet, row, col, value) => {
      const key = formulaKey(sheet.id, row, col);

      interrupt();
      forget(key);
      claim(key);
      write(sheet, row, col, value);
      touch({ sheet, row, col });
    },
    setLocale: (next) => {
      interrupt();
      locale = next;
      contexts.clear();
      formulas.forEach((_record, key) => pending.add(key));
    },
    get locale() {
      return locale;
    },
    formulaAt: (sheet, row, col) => formulas.get(formulaKey(sheet.id, row, col))?.cell,
    spillOf: (sheet, row, col) => spills.areaOf(formulaKey(sheet.id, row, col))?.range,
    recalculate: (options = {}) => {
      interrupt();
      now = serialOf(clock());
      if (options.volatile !== false) {
        volatiles.forEach((key) => pending.add(key));
      }

      const first = plan(options.viewport);

      const run: Run = {
        ...first,
        budget: options.budgetMs ?? DEFAULT_BUDGET,
        index: 0,
        done: 0,
        total: first.queue.length,
        passes: 0,
        busy: 0,
        cancelled: false,
      };

      current = run;
      const settled = step(run) ? Promise.resolve() : proceed(run, options.yieldTo ?? nextTask);

      return {
        get total() {
          return run.total;
        },
        get done() {
          return run.done;
        },
        get busyMs() {
          return run.busy;
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
