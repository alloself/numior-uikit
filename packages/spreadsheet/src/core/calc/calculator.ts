import { MAX_COLS, MAX_ROWS, cellIndex, containsCell } from '../address';
import {
  CellInputKind,
  CellValueKind,
  LineAxis,
  type CellRange,
  type CellValue,
} from '../cell.types';
import {
  FormulaNodeKind,
  FormulaReferenceKind,
  type FormulaLocale,
  type FormulaNode,
  type FormulaParse,
  type SignatureOf,
} from '../formula/formula.types';
import { EN_LOCALE, type BookLocale } from '../locale';
import { shiftIndex } from '../lines';
import { ORIGIN, referenceRange } from '../formula/origin';
import { parseFormula } from '../formula/parser';
import { changesMeaning, shiftFormula, shiftSpan, type LineChange } from '../formula/rewrite';
import { readReferences } from '../formula/references';
import { findNode } from '../formula/walk';
import { EMPTY, errorValue, numberValue } from '../values';
import { structuredRange, tableData } from '../tables';
import {
  bookNames,
  localSheet,
  tableFor,
  type DefinedName,
  type Sheet,
  type SheetTable,
  type Workbook,
} from '../workbook';
import {
  EvalValueKind,
  FormulaState,
  type ArrayValue,
  type CellContent,
  type FormulaCell,
  type FormulaPlace,
  type FormulaResult,
  type FunctionRegistry,
  type Limitation,
  type RecalcOptions,
  type Recalculation,
  type ShiftedFormulaCell,
  type ShiftedName,
} from './calc.types';
import { lookupKey } from './coerce';
import { evaluateFormula, type EvalContext } from './evaluate';
import { BASE_FUNCTIONS } from './functions';
import {
  createDependencyGraph,
  createPlanner,
  formulaKey,
  planRecalc,
  type Precedent,
  type RecalcPlanner,
} from './graph';
import { signaturesOf } from './excel-signatures';
import { createFunctionRegistry } from './registry';
import { createTreeSharing } from './shared-trees';
import { nextTask } from './tasks';
import { createSpills, forEachSpillCell, type SpillArea, type SpillCell } from './spills';

export interface ImportedFormula {
  readonly value: CellValue;
  readonly spill?: CellRange | undefined;
  readonly recalculate: boolean;
  readonly keep?: boolean | undefined;
}

export type UserRewrite = (sheet: Sheet, row: number, col: number, ast: FormulaNode) => FormulaNode;

export interface Calculator {
  setFormula(
    sheet: Sheet,
    row: number,
    col: number,
    text: string,
    locale?: FormulaLocale,
  ): FormulaParse;
  setValue(sheet: Sheet, row: number, col: number, value: CellValue): void;
  importValue(sheet: Sheet, row: number, col: number, value: CellValue): void;
  outdated(): (sheet: Sheet, row: number, col: number) => boolean;
  staleAt(sheet: Sheet, row: number, col: number): boolean;
  importFormula(
    sheet: Sheet,
    row: number,
    col: number,
    ast: FormulaNode,
    imported: ImportedFormula,
  ): void;
  setContent(sheet: Sheet, row: number, col: number, content: CellContent): void;
  contentAt(sheet: Sheet, row: number, col: number): CellContent;
  forEachFormula(visit: (sheet: Sheet, row: number, col: number, ast: FormulaNode) => void): void;
  forEachUser(
    name: string,
    visit: (sheet: Sheet, row: number, col: number, ast: FormulaNode) => void,
  ): void;
  shiftLines(sheet: Sheet, change: LineChange): readonly ShiftedFormulaCell[];
  shiftNames(change: LineChange): readonly ShiftedName[];
  setName(name: string, scope: Sheet | undefined, ast: FormulaNode | undefined): void;
  setTable(name: string, table: SheetTable | undefined, rewrite?: UserRewrite): void;
  hasFormulaIn(sheet: Sheet, range: CellRange): boolean;
  formulaAt(sheet: Sheet, row: number, col: number): FormulaCell | undefined;
  spillOf(sheet: Sheet, row: number, col: number): CellRange | undefined;
  recalculate(options?: RecalcOptions): Recalculation;
  evaluateAt(sheet: Sheet, row: number, col: number, ast: FormulaNode): CellValue;
  setLocale(locale: BookLocale): void;
  readonly locale: BookLocale;
  readonly functions: FunctionRegistry;
  readonly signatures: SignatureOf;
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
  readonly id: number;
  cell: FormulaCell;
  readonly sheet: Sheet;
  row: number;
  col: number;
  precedents: readonly Precedent[];
  names: ReadonlySet<string>;
  dynamic: boolean;
}

interface ShiftPlan {
  readonly record: FormulaRecord;
  readonly line: number;
  readonly ast: FormulaNode;
  readonly relink: boolean;
}

interface Run {
  planner: RecalcPlanner | undefined;
  readonly viewport: RecalcOptions['viewport'];
  marked: number;
  queue: readonly number[];
  cycles: ReadonlySet<number>;
  readonly budget: number;
  index: number;
  done: number;
  total: number;
  passes: number;
  busy: number;
  longest: number;
  finished: boolean;
  cancelled: boolean;
  dropped: boolean;
}

interface LookupIndex {
  readonly version: number;
  readonly rows: Map<string, number>;
  bottom: number;
}

interface Links {
  readonly precedents: Precedent[];
  readonly names: Set<string>;
}

interface FoundLinks {
  readonly precedents: Precedent[];
  readonly names: ReadonlySet<string>;
}

type Placed = Pick<FormulaRecord, 'sheet' | 'row' | 'col'>;

const DEFAULT_BUDGET = 8;

const CHECK_EVERY = 32;

const MAX_PASSES = 16;

const PLAN_STEPS = 16_384;

const SMALL_AREA = 4096;

const DAY_MS = 86_400_000;

const SERIAL_EPOCH = Date.UTC(1899, 11, 30);

const BASE_REGISTRY = createFunctionRegistry(BASE_FUNCTIONS);

const SPILL_ERROR = errorValue('#SPILL!');

const NO_NAMES: ReadonlySet<string> = new Set();

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

const oneCell = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

const definedFor = (
  workbook: Workbook,
  sheet: Sheet,
  node: Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Name }>,
): DefinedName | undefined => {
  const home = localSheet(workbook, node, sheet);

  return home === undefined ? undefined : workbook.names.resolve(node.name, home);
};

const structuredLinks = (
  found: Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Structured }>,
  record: Placed,
  workbook: Workbook,
  links: Links,
): void => {
  if (found.book !== undefined) {
    return;
  }

  const table = tableFor(workbook, found.table, record.sheet, record.row, record.col);
  const owner = found.table ?? table?.name;
  const range = table === undefined ? undefined : structuredRange(table, found, record.row);

  if (owner !== undefined) {
    links.names.add(owner.toLowerCase());
  }
  if (table === undefined || typeof range !== 'object') {
    return;
  }

  links.precedents.push({ sheet: table.sheet.id, range });
};

const collectLinks = (
  ast: FormulaNode,
  record: Placed,
  workbook: Workbook,
  links: Links,
  seen: Set<DefinedName>,
): void => {
  readReferences(ast).forEach((found) => {
    if (found.kind === FormulaReferenceKind.Structured) {
      structuredLinks(found, record, workbook, links);
      return;
    }
    if (found.kind === FormulaReferenceKind.Name) {
      nameLinks(found, record, workbook, links, seen);
      return;
    }

    const target = localSheet(workbook, found, record.sheet);
    const range = referenceRange(found, record);

    if (target === undefined || range === undefined) {
      return;
    }

    links.precedents.push({ sheet: target.id, range });
  });
};

const nameLinks = (
  found: Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Name }>,
  record: Placed,
  workbook: Workbook,
  links: Links,
  seen: Set<DefinedName>,
): void => {
  if (found.book !== undefined) {
    return;
  }

  const defined = definedFor(workbook, record.sheet, found);
  const table = found.sheet === undefined ? workbook.tables.get(found.name) : undefined;

  links.names.add(found.name.toLowerCase());
  if (defined !== undefined && !seen.has(defined)) {
    seen.add(defined);
    collectLinks(defined.ast, record, workbook, links, seen);
  } else if (defined === undefined && table !== undefined) {
    links.precedents.push({ sheet: table.sheet.id, range: tableData(table) });
  }
};

const samePrecedents = (left: readonly Precedent[], right: readonly Precedent[]): boolean =>
  left.length === right.length &&
  left.every((precedent, index) => {
    const other = right[index];

    return (
      other !== undefined &&
      other.sheet === precedent.sheet &&
      other.range.top === precedent.range.top &&
      other.range.left === precedent.range.left &&
      other.range.bottom === precedent.range.bottom &&
      other.range.right === precedent.range.right
    );
  });

const sameNames = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean =>
  left.size === right.size && [...left].every((name) => right.has(name));

const linksOf = (ast: FormulaNode, record: Placed, workbook: Workbook): FoundLinks => {
  const links: Links = { precedents: [], names: new Set() };

  collectLinks(ast, record, workbook, links, new Set());
  return links.names.size === 0 ? { precedents: links.precedents, names: NO_NAMES } : links;
};

const SUBTOTALS = new Set(['SUBTOTAL', 'AGGREGATE']);

const subtotals = new WeakMap<FormulaNode, boolean>();

const subtotalIn = (node: FormulaNode): boolean =>
  findNode(node, (item) => item.kind === FormulaNodeKind.Call && SUBTOTALS.has(item.name)) !==
  undefined;

const callsSubtotal = (node: FormulaNode): boolean => {
  const known = subtotals.get(node);

  if (known !== undefined) {
    return known;
  }

  const found = subtotalIn(node);

  subtotals.set(node, found);
  return found;
};

const usesVolatile = (node: FormulaNode, functions: FunctionRegistry): boolean =>
  findNode(
    node,
    (item) => item.kind === FormulaNodeKind.Call && functions.get(item.name)?.volatile === true,
  ) !== undefined;

const indexDown = (sheet: Sheet, range: CellRange, index: LookupIndex): void => {
  sheet.cells.forEachInRange({ ...range, top: index.bottom + 1 }, (row, _col, value) => {
    const key = lookupKey(value);

    if (key === undefined || index.rows.has(key)) {
      return;
    }

    index.rows.set(key, row - range.top);
  });

  index.bottom = range.bottom;
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

const lastLine = (range: CellRange, axis: LineChange['axis']): number =>
  axis === LineAxis.Rows ? range.bottom : range.right;

const shiftPrecedent = (
  precedent: Precedent,
  sheet: number,
  change: LineChange,
): Precedent | undefined => {
  const { range } = precedent;
  const rows = change.axis === LineAxis.Rows;
  const first = rows ? range.top : range.left;
  const last = rows ? range.bottom : range.right;
  const whole = first === 0 && last === (rows ? MAX_ROWS : MAX_COLS) - 1;

  if (precedent.sheet !== sheet || whole || last < change.at) {
    return precedent;
  }

  const span = shiftSpan([first, last], change);

  if (span === undefined) {
    return undefined;
  }
  return {
    sheet,
    range: rows
      ? { ...range, top: span[0], bottom: span[1] }
      : { ...range, left: span[0], right: span[1] },
  };
};

const shiftPrecedents = (
  precedents: readonly Precedent[],
  sheet: number,
  change: LineChange,
): readonly Precedent[] =>
  precedents.flatMap((precedent) => {
    const shifted = shiftPrecedent(precedent, sheet, change);

    return shifted === undefined ? [] : [shifted];
  });

const applyShift = (move: ShiftPlan, axis: LineChange['axis']): void => {
  const { record, ast, line } = move;

  if (ast !== record.cell.ast) {
    record.cell = { ...record.cell, ast };
  }
  if (axis === LineAxis.Rows) {
    record.row = line;
  } else {
    record.col = line;
  }
};

const insideSheet = (range: CellRange): boolean =>
  range.bottom < MAX_ROWS && range.right < MAX_COLS;

const plannedRun = (run: Run): boolean =>
  run.planner === undefined && run.marked >= run.queue.length;

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
  const trees = createTreeSharing();
  const signatures = signaturesOf(functions);
  const spills = createSpills();
  const formulas = new Map<number, FormulaRecord>();
  const positions = new Map<number, Map<number, number>>();
  let nextId = 0;
  const pending = new Set<number>();
  const volatiles = new Set<number>();
  const kept = new Set<number>();
  const versions = new Map<number, number>();
  const lookups = new Map<string, LookupIndex>();
  const unknown = new Set<string>();
  const contexts = new Map<Sheet, EvalContext>();
  const nameUsers = new Map<string, Set<number>>();
  let current: Run | undefined;
  let locale = initialLocale;
  let now = serialOf(clock());
  let evaluating: FormulaPlace | undefined;
  const dynamic: Precedent[] = [];

  const positionsOf = (sheet: number): Map<number, number> => {
    const known = positions.get(sheet);

    if (known !== undefined) {
      return known;
    }

    const created = new Map<number, number>();

    positions.set(sheet, created);
    return created;
  };

  const idAt = (sheet: number, row: number, col: number): number | undefined =>
    positions.get(sheet)?.get(cellIndex(row, col));

  const recordAt = (sheet: Sheet, row: number, col: number): FormulaRecord | undefined => {
    const id = idAt(sheet.id, row, col);

    return id === undefined ? undefined : formulas.get(id);
  };

  const locate = (id: number) => {
    const record = formulas.get(id);

    return record === undefined
      ? undefined
      : { sheet: record.sheet.id, row: record.row, col: record.col };
  };

  const columnVersion = (sheet: Sheet, col: number): number =>
    versions.get(sheet.id * MAX_COLS + col) ?? 0;

  const write = (sheet: Sheet, row: number, col: number, value: CellValue): void => {
    sheet.cells.set(row, col, value);
    versions.set(sheet.id * MAX_COLS + col, columnVersion(sheet, col) + 1);
  };

  const lookup = (sheet: Sheet, range: CellRange, wanted: CellValue): number | undefined => {
    const key = lookupKey(wanted);
    const id = `${String(sheet.id)}:${String(range.top)}:${String(range.left)}`;
    const version = columnVersion(sheet, range.left);
    const known = lookups.get(id);

    const index =
      known?.version === version ? known : { version, rows: new Map(), bottom: range.top - 1 };

    if (index.bottom < range.bottom) {
      indexDown(sheet, range, index);
    }
    lookups.set(id, index);

    const found = key === undefined ? undefined : index.rows.get(key);

    return found === undefined || found > range.bottom - range.top ? undefined : found;
  };

  const contextFor = (sheet: Sheet): EvalContext => {
    const known = contexts.get(sheet);

    if (known !== undefined) {
      return known;
    }

    const home = { sheet, row: 0, col: 0 };

    const context: EvalContext = {
      workbook,
      sheet,
      functions,
      locale: locale.numbers,
      lookup,
      unknown: (name) => unknown.add(name),
      spillRange: (target, row, col) => {
        const id = idAt(target.id, row, col);

        return id === undefined ? undefined : spills.areaOf(id)?.range;
      },
      now: () => now,
      random,
      here: () => evaluating ?? home,
      track: (target, range) => {
        dynamic.push({ sheet: target.id, range });
      },
      definedName: (node) => definedFor(workbook, (evaluating ?? home).sheet, node),
      subtotalAt: (target, row, col) => {
        const ast = recordAt(target, row, col)?.cell.ast;

        return ast !== undefined && callsSubtotal(ast);
      },
    };

    contexts.set(sheet, context);
    return context;
  };

  const interrupt = (): void => {
    if (current === undefined) {
      return;
    }

    current.cancelled = true;
    current.dropped = true;
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
      taken ||=
        cell.sheet.cells.has(cell.row, cell.col) ||
        idAt(cell.sheet.id, cell.row, cell.col) !== undefined ||
        spills.owns(key);
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
    if (result.kind === EvalValueKind.Array) {
      spill(key, record, result);
    } else {
      writeAnchor(record, result);
    }
  };

  const pendingInside = (precedent: Precedent): boolean => {
    const { range } = precedent;

    if ((range.bottom - range.top + 1) * (range.right - range.left + 1) > SMALL_AREA) {
      return [...pending].some((key) => {
        const record = formulas.get(key);

        return record?.sheet.id === precedent.sheet && containsCell(range, record.row, record.col);
      });
    }
    for (let row = range.top; row <= range.bottom; row += 1) {
      for (let col = range.left; col <= range.right; col += 1) {
        const id = idAt(precedent.sheet, row, col);

        if (id !== undefined && pending.has(id)) {
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
    if (!found.some(pendingInside)) {
      return;
    }

    pending.add(key);
  };

  const compute = (key: number, cycles: ReadonlySet<number>): void => {
    const listed = pending.delete(key);
    const record = formulas.get(key);

    if (record === undefined || !listed || kept.has(key)) {
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
      order.filter((key) => {
        const record = formulas.get(key);

        return (
          record?.sheet.id === precedent.sheet &&
          containsCell(precedent.range, record.row, record.col)
        );
      });

    for (let key = seeds.pop(); key !== undefined; key = seeds.pop()) {
      if (needed.has(key)) {
        continue;
      }

      needed.add(key);

      graph.precedentsOf(key).forEach((precedent) => {
        const direct = idAt(precedent.sheet, precedent.range.top, precedent.range.left);

        const found = oneCell(precedent.range)
          ? direct === undefined
            ? []
            : [direct]
          : inside(precedent);

        for (const candidate of found) {
          if (!planned.has(candidate)) {
            continue;
          }

          seeds.push(candidate);
        }
      });
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

  const markStale = (key: number): void => {
    const record = formulas.get(key);

    pending.add(key);
    if (record === undefined || kept.has(key)) {
      return;
    }

    record.cell.state = 'stale';
  };

  const plan = (viewport: RecalcOptions['viewport']) => {
    const planned = planRecalc(pending, graph, locate);

    planned.order.forEach(markStale);
    return { queue: prioritised(planned.order, viewport), cycles: planned.cycles };
  };

  const marked = (run: Run, started: number): boolean => {
    const from = run.marked;

    while (run.marked < run.queue.length) {
      markStale(run.queue[run.marked] ?? -1);
      run.marked += 1;
      if (
        run.marked - from >= PLAN_STEPS &&
        run.marked % CHECK_EVERY === 0 &&
        performance.now() - started > run.budget
      ) {
        return false;
      }
    }
    return true;
  };

  const planning = (run: Run, started: number): boolean => {
    const found = run.planner?.advance(() => performance.now() - started > run.budget, PLAN_STEPS);

    if (run.planner === undefined) {
      return true;
    }
    if (found === undefined) {
      return false;
    }

    run.planner = undefined;
    run.queue = prioritised(found.order, run.viewport);
    run.cycles = found.cycles;
    run.total = run.queue.length;
    return true;
  };

  const replan = (run: Run): boolean => {
    if (pending.size === 0 || run.passes >= MAX_PASSES) {
      return false;
    }
    const next = plan(undefined);

    run.queue = next.queue;
    run.marked = next.queue.length;
    run.cycles = next.cycles;
    run.index = 0;
    run.passes += 1;
    run.total += next.queue.length;
    return true;
  };

  const slice = (run: Run, started: number): boolean => {
    if (!planning(run, started) || !marked(run, started)) {
      return false;
    }
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
    const spent = performance.now() - started;

    run.busy += spent;
    run.longest = Math.max(run.longest, spent);
    run.finished = finished || run.cancelled;
    return finished;
  };

  const proceed = (run: Run, yieldTo: () => Promise<void>): Promise<void> =>
    yieldTo().then(() => (run.dropped || step(run) ? undefined : proceed(run, yieldTo)));

  const usersOf = (name: string): Set<number> => {
    const known = nameUsers.get(name);

    if (known !== undefined) {
      return known;
    }

    const created = new Set<number>();

    nameUsers.set(name, created);
    return created;
  };

  const register = (key: number, names: ReadonlySet<string>): void => {
    names.forEach((name) => {
      usersOf(name).add(key);
    });
  };

  const unregister = (key: number, names: ReadonlySet<string>): void => {
    names.forEach((name) => {
      nameUsers.get(name)?.delete(key);
    });
  };

  const forget = (sheet: Sheet, row: number, col: number): void => {
    const id = idAt(sheet.id, row, col);

    if (id === undefined) {
      return;
    }

    kept.delete(id);
    unregister(id, formulas.get(id)?.names ?? NO_NAMES);
    formulas.delete(id);
    positions.get(sheet.id)?.delete(cellIndex(row, col));
    graph.remove(id);
    pending.delete(id);
    volatiles.delete(id);
    release(id);
  };

  const claim = (key: number): void => {
    const owner = spills.claim(key);

    if (owner === undefined) {
      return;
    }

    pending.add(owner);
  };

  const setParsed = (sheet: Sheet, row: number, col: number, parsed: FormulaNode): void => {
    const ast = trees.share(sheet.id, col, parsed);
    const known = idAt(sheet.id, row, col);
    const key = known ?? nextId;
    const cell: FormulaCell = { ast, state: 'stale' };
    const links = linksOf(ast, { sheet, row, col }, workbook);

    const record: FormulaRecord = {
      id: key,
      cell,
      sheet,
      row,
      col,
      precedents: links.precedents,
      names: links.names,
      dynamic: false,
    };

    interrupt();
    kept.delete(key);
    unregister(key, (known === undefined ? undefined : formulas.get(known))?.names ?? NO_NAMES);
    register(key, links.names);
    if (known === undefined) {
      nextId += 1;
      positionsOf(sheet.id).set(cellIndex(row, col), key);
    }
    claim(formulaKey(sheet.id, row, col));
    formulas.set(key, record);
    graph.set(key, record.precedents);
    pending.add(key);
    if (usesVolatile(ast, functions)) {
      volatiles.add(key);
    } else {
      volatiles.delete(key);
    }
  };

  const relinkName = (name: string, rewrite?: UserRewrite): void => {
    const snapshot = [...(nameUsers.get(name) ?? [])];

    snapshot.forEach((key) => {
      const record = formulas.get(key);

      if (record === undefined) {
        return;
      }

      const ast =
        rewrite === undefined
          ? record.cell.ast
          : rewrite(record.sheet, record.row, record.col, record.cell.ast);

      if (ast !== record.cell.ast) {
        record.cell = { ast, state: record.cell.state };
      }

      const links = linksOf(ast, record, workbook);
      const unchanged = samePrecedents(links.precedents, record.precedents);

      if (!sameNames(links.names, record.names)) {
        unregister(key, record.names);
        register(key, links.names);
        record.names = links.names;
      }
      if (!unchanged) {
        record.precedents = links.precedents;
        graph.set(key, links.precedents);
      }
      if (rewrite !== undefined && unchanged) {
        return;
      }

      record.cell.state = 'stale';
      pending.add(key);
    });
  };

  const setName = (name: string, scope: Sheet | undefined, ast: FormulaNode | undefined): void => {
    interrupt();
    if (ast === undefined) {
      workbook.names.delete(name, scope);
    } else {
      workbook.names.set(name, scope, ast);
    }
    relinkName(name.toLowerCase());
  };

  const setTable = (name: string, table: SheetTable | undefined, rewrite?: UserRewrite): void => {
    interrupt();
    if (table === undefined) {
      workbook.tables.delete(name);
    } else {
      workbook.tables.set(table);
    }
    relinkName(name.toLowerCase(), rewrite);
  };

  const shiftNames = (change: LineChange): ShiftedName[] => {
    const shifted: ShiftedName[] = [];

    workbook.names.forEach((defined) => {
      const ast = shiftFormula(defined.ast, change, false, ORIGIN);

      if (ast === defined.ast) {
        return;
      }

      shifted.push({ name: defined.name, scope: defined.scope, before: defined.ast });
      setName(defined.name, defined.scope, ast);
    });

    return shifted;
  };

  const releaseCrossing = (sheet: Sheet, change: LineChange): void => {
    const crossing: number[] = [];

    spills.forEachArea((anchor, area) => {
      if (area.sheet !== sheet || lastLine(area.range, change.axis) < change.at) {
        return;
      }

      crossing.push(anchor);
    });

    crossing.forEach((anchor) => {
      release(anchor);
      pending.add(anchor);
    });
  };

  const shiftPositions = (sheet: Sheet, change: LineChange): void => {
    const local = positions.get(sheet.id);
    const start = change.at + Math.max(-change.count, 0);
    const rows = change.axis === LineAxis.Rows;
    const offset = rows ? change.count * MAX_COLS : change.count;
    const moved: number[] = [];

    local?.forEach((id, cell) => {
      if ((rows ? Math.floor(cell / MAX_COLS) : cell % MAX_COLS) < start) {
        return;
      }

      moved.push(cell, id);
    });

    for (let index = 0; index < moved.length; index += 2) {
      local?.delete(moved[index] ?? -1);
    }
    for (let index = 0; index < moved.length; index += 2) {
      local?.set((moved[index] ?? 0) + offset, moved[index + 1] ?? 0);
    }
  };

  const shiftLines = (sheet: Sheet, change: LineChange): ShiftedFormulaCell[] => {
    interrupt();
    releaseCrossing(sheet, change);

    const shifted: ShiftedFormulaCell[] = [];
    const rewritten: ShiftPlan[] = [];
    const rows = change.axis === LineAxis.Rows;

    formulas.forEach((record) => {
      const onSheet = record.sheet === sheet;
      const before = rows ? record.row : record.col;
      const line = onSheet ? shiftIndex(before, change) : before;

      if (line === undefined) {
        graph.remove(record.id);
        forget(record.sheet, record.row, record.col);
        return;
      }

      const ast = shiftFormula(record.cell.ast, change, onSheet, record);

      if (ast === record.cell.ast) {
        if (line !== before) {
          applyShift({ record, line, ast, relink: false }, change.axis);
        }
        return;
      }

      const semantic = changesMeaning(record.cell.ast, change, onSheet, record);
      const relink = semantic || record.dynamic;

      if (semantic) {
        shifted.push({
          sheet: record.sheet,
          row: record.row,
          col: record.col,
          before: record.cell.ast,
        });
      }
      if (relink) {
        graph.remove(record.id);
      }
      rewritten.push({ record, line, ast, relink });
    });

    graph.shift(sheet.id, change);
    shiftPositions(sheet, change);

    rewritten.forEach((move) => {
      const { record, relink } = move;

      applyShift(move, change.axis);
      if (relink) {
        record.precedents = shiftPrecedents(record.precedents, sheet.id, change);
        graph.set(record.id, record.precedents);
        record.cell.state = 'stale';
        pending.add(record.id);
      } else {
        record.precedents = graph.precedentsOf(record.id);
      }
    });

    sheet.cells.shiftLines(change.axis, change.at, change.count);
    lookups.clear();
    return shifted;
  };

  const setValue = (sheet: Sheet, row: number, col: number, value: CellValue): void => {
    interrupt();
    forget(sheet, row, col);
    claim(formulaKey(sheet.id, row, col));
    write(sheet, row, col, value);
    touch({ sheet, row, col });
  };

  return {
    setFormula: (sheet, row, col, text, syntax = locale.formulas) => {
      const parsed = parseFormula(
        text,
        syntax,
        { row, col },
        {
          ...bookNames(workbook),
          signatures,
        },
      );

      if (parsed.ok) {
        setParsed(sheet, row, col, parsed.ast);
      }
      return parsed;
    },
    setValue,
    importValue: write,
    outdated: () => {
      const planned = new Set(pending.size === 0 ? [] : planRecalc(pending, graph, locate).order);

      return (sheet, row, col) => {
        const id = idAt(sheet.id, row, col);

        return id !== undefined && planned.has(id);
      };
    },
    staleAt: (sheet, row, col) => {
      const id = idAt(sheet.id, row, col);
      const record = id === undefined ? undefined : formulas.get(id);

      if (id === undefined || record === undefined || kept.has(id)) {
        return false;
      }
      return (
        record.cell.state === FormulaState.Stale ||
        pending.has(id) ||
        (current !== undefined && !current.dropped && !plannedRun(current))
      );
    },
    importFormula: (sheet, row, col, ast, imported) => {
      setParsed(sheet, row, col, ast);

      const key = idAt(sheet.id, row, col);
      const record = key === undefined ? undefined : formulas.get(key);

      if (key === undefined || record === undefined) {
        return;
      }
      if (!imported.recalculate || imported.keep === true) {
        pending.delete(key);
      }
      if (imported.keep === true) {
        kept.add(key);
      }
      record.cell.state = 'imported';
      write(sheet, row, col, imported.value);
      if (imported.spill === undefined || oneCell(imported.spill)) {
        return;
      }

      spills.occupy(key, { sheet, range: imported.spill });
    },
    setContent: (sheet, row, col, content) => {
      switch (content.kind) {
        case CellInputKind.Formula:
          setParsed(sheet, row, col, content.ast);
          break;
        case CellInputKind.Value:
          setValue(sheet, row, col, content.value);
          break;
        case CellInputKind.Empty:
          setValue(sheet, row, col, EMPTY);
          break;
      }
    },
    contentAt: (sheet, row, col) => {
      const record = recordAt(sheet, row, col);

      if (record !== undefined) {
        return { kind: 'formula', ast: record.cell.ast };
      }

      const value = sheet.cells.get(row, col);

      return value.kind === CellValueKind.Empty || spills.owns(formulaKey(sheet.id, row, col))
        ? { kind: 'empty' }
        : { kind: 'value', value };
    },
    shiftLines,
    shiftNames,
    setName,
    setTable,
    forEachUser: (name, visit) => {
      const snapshot = [...(nameUsers.get(name.toLowerCase()) ?? [])];

      snapshot.forEach((key) => {
        const record = formulas.get(key);

        if (record === undefined) {
          return;
        }

        visit(record.sheet, record.row, record.col, record.cell.ast);
      });
    },
    hasFormulaIn: (sheet, range) => {
      for (const cell of positions.get(sheet.id)?.keys() ?? []) {
        if (containsCell(range, Math.floor(cell / MAX_COLS), cell % MAX_COLS)) {
          return true;
        }
      }
      return false;
    },
    forEachFormula: (visit) => {
      formulas.forEach((record) => {
        visit(record.sheet, record.row, record.col, record.cell.ast);
      });
    },
    evaluateAt: (sheet, row, col, ast) => {
      const before = evaluating;
      const tracked = dynamic.length;

      evaluating = { sheet, row, col };

      const result = evaluateFormula(ast, contextFor(sheet));

      evaluating = before;
      dynamic.length = tracked;
      return result.kind === EvalValueKind.Array ? (result.rows[0]?.[0] ?? EMPTY) : result;
    },
    setLocale: (next) => {
      interrupt();
      locale = next;
      contexts.clear();
      formulas.forEach((_record, key) => pending.add(key));
    },
    functions,
    signatures,
    get locale() {
      return locale;
    },
    formulaAt: (sheet, row, col) => recordAt(sheet, row, col)?.cell,
    spillOf: (sheet, row, col) => {
      const id = idAt(sheet.id, row, col);

      return id === undefined ? undefined : spills.areaOf(id)?.range;
    },
    recalculate: (options = {}) => {
      interrupt();
      now = serialOf(clock());
      if (options.volatile !== false) {
        volatiles.forEach((key) => pending.add(key));
      }
      if (options.imported === true) {
        formulas.forEach((record, key) => {
          if (record.cell.state !== FormulaState.Imported || kept.has(key)) {
            return;
          }

          pending.add(key);
        });
      }

      const run: Run = {
        planner: createPlanner(pending, graph, locate),
        viewport: options.viewport,
        marked: 0,
        queue: [],
        cycles: new Set(),
        budget: options.budgetMs ?? DEFAULT_BUDGET,
        index: 0,
        done: 0,
        total: 0,
        passes: 0,
        busy: 0,
        longest: 0,
        finished: false,
        cancelled: false,
        dropped: false,
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
        get longestMs() {
          return run.longest;
        },
        get finished() {
          return run.finished || run.cancelled;
        },
        get planned() {
          return plannedRun(run);
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
