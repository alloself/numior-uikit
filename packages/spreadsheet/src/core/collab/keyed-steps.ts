import { CellInputKind } from '../cell.types';
import type { ConditionalFormat } from '../conditional/conditional.types';
import { mapConditionalFormulas } from '../conditional/shift';
import { FormulaReferenceKind, type FormulaNode } from '../formula/formula.types';
import { mapReferences } from '../formula/references';
import { BROKEN, type LineChange } from '../formula/rewrite';
import type { SheetLayout } from '../layout/layout.types';
import { mapLayoutFormulas } from '../layout/line-layouts';
import { PivotSourceKind, type PivotSource, type PivotSpec } from '../pivot/pivot.types';
import {
  StepKind,
  type CellEdit,
  type SheetStep,
  type TableSpec,
  type WorkbookStep,
} from '../steps/step.types';
import type { Workbook } from '../workbook';
import { RemoteChangeKind, type RemoteChange } from './collab.types';
import { changesOf } from './remote-change';
import { flattened } from './schema';

export interface SheetNames {
  readonly keyOf: (name: string) => string | undefined;
  readonly nameOf: (key: string) => string | undefined;
}

export interface KeptNames extends SheetNames {
  readonly entries: ReadonlyMap<string, string>;
}

export interface Scope extends SheetNames {
  readonly add: (name: string, key: string) => void;
  readonly remove: (key: string) => void;
  readonly rename: (key: string, name: string) => void;
}

interface Overlay {
  readonly names: Map<string, string | undefined>;
  readonly keys: Map<string, string | undefined>;
}

type SheetMap = (sheet: string) => string | undefined;

type SourceMap = (source: PivotSource) => PivotSource;

interface Mapping {
  readonly formula: SheetMap;
  readonly source: SourceMap;
}

type StepOf<K extends WorkbookStep['kind']> = Extract<WorkbookStep, { readonly kind: K }>;

interface Direction {
  readonly sheet: (scope: Scope) => SheetMap;
  readonly scoped: (sheet: string, mapped: string) => string;
  readonly formula: (scope: Scope) => SheetMap;
  readonly source: (scope: Scope, formula: SheetMap) => SourceMap;
}

interface Pass {
  readonly scope: Scope;
  readonly sheet: SheetMap;
  readonly scoped: (sheet: string, mapped: string) => string;
  readonly mapping: Mapping;
}

const ABSENT = ':';

const LOST_SOURCE: PivotSource = { kind: PivotSourceKind.Lost };

export const scopeOver = (base: SheetNames): Scope => {
  let overlay: Overlay | undefined;

  const nameOf = (key: string): string | undefined =>
    overlay?.names.has(key) === true ? overlay.names.get(key) : base.nameOf(key);

  const keyOf = (name: string): string | undefined => {
    const lower = name.toLowerCase();

    return overlay?.keys.has(lower) === true ? overlay.keys.get(lower) : base.keyOf(name);
  };

  const opened = (): Overlay => {
    overlay ??= { names: new Map(), keys: new Map() };
    return overlay;
  };

  const forget = (key: string): void => {
    const name = nameOf(key);

    if (name === undefined) {
      return;
    }

    opened().keys.set(name.toLowerCase(), undefined);
  };

  return {
    keyOf,
    nameOf,
    add: (name, key) => {
      opened().names.set(key, name);
      opened().keys.set(name.toLowerCase(), key);
    },
    remove: (key) => {
      forget(key);
      opened().names.set(key, undefined);
    },
    rename: (key, name) => {
      forget(key);
      opened().names.set(key, name);
      opened().keys.set(name.toLowerCase(), key);
    },
  };
};

export const sheetKeys = (book: Workbook): SheetNames => ({
  keyOf: (name) => book.sheet(name)?.key,
  nameOf: (key) => book.keyed(key)?.name,
});

export const keptNames = (book: Workbook): KeptNames => {
  const entries = new Map<string, string>();
  const keys = new Map<string, string>();

  book.sheets.forEach((sheet) => {
    entries.set(sheet.key, sheet.name);
    keys.set(sheet.name.toLowerCase(), sheet.key);
  });

  return {
    entries,
    keyOf: (name) => keys.get(name.toLowerCase()),
    nameOf: (key) => entries.get(key),
  };
};

export const namesKept = (kept: KeptNames, book: Workbook): boolean =>
  [...kept.entries].every(([key, name]) => book.keyed(key)?.name === name);

const sheetsMapped = (ast: FormulaNode, map: SheetMap): FormulaNode =>
  mapReferences(ast, (reference) => {
    if (
      reference.kind === FormulaReferenceKind.Structured ||
      reference.book !== undefined ||
      reference.sheet === undefined
    ) {
      return reference;
    }

    const sheet = map(reference.sheet);

    if (sheet === undefined) {
      return BROKEN;
    }
    return sheet === reference.sheet ? reference : { ...reference, sheet };
  });

const cellMapped = (edit: CellEdit, map: SheetMap): CellEdit => {
  if (edit.content?.kind !== CellInputKind.Formula) {
    return edit;
  }

  const ast = sheetsMapped(edit.content.ast, map);

  return ast === edit.content.ast ? edit : { ...edit, content: { ...edit.content, ast } };
};

const cellsMapped = (cells: readonly CellEdit[], map: SheetMap): readonly CellEdit[] => {
  let mapped: CellEdit[] | undefined;

  cells.forEach((edit, index) => {
    const next = cellMapped(edit, map);

    if (next === edit && mapped === undefined) {
      return;
    }

    mapped ??= cells.slice(0, index);
    mapped.push(next);
  });

  return mapped ?? cells;
};

const formatsMapped = (
  formats: readonly ConditionalFormat[],
  map: SheetMap,
): readonly ConditionalFormat[] => mapConditionalFormulas(formats, (ast) => sheetsMapped(ast, map));

const layoutMapped = (layout: SheetLayout, map: SheetMap): SheetLayout =>
  mapLayoutFormulas(layout, (ast) => sheetsMapped(ast, map));

const pivotMapped = <P extends PivotSpec>(pivot: P, source: SourceMap): P => ({
  ...pivot,
  definition: { ...pivot.definition, source: source(pivot.definition.source) },
});

const optional = <A, B>(value: A | undefined, map: (value: A) => B): B | undefined =>
  value === undefined ? undefined : map(value);

const sheetBody = (step: SheetStep, sheet: string, mapping: Mapping): WorkbookStep => {
  const { formula, source } = mapping;
  const mappedLayout = (each: SheetLayout): SheetLayout => layoutMapped(each, formula);
  const mappedPivot = <P extends PivotSpec>(each: P): P => pivotMapped(each, source);

  switch (step.kind) {
    case StepKind.SetCells:
      return { ...step, sheet, cells: cellsMapped(step.cells, formula) };
    case StepKind.SetFormat:
    case StepKind.InsertLines:
    case StepKind.DeleteLines:
    case StepKind.RefreshPivot:
      return { ...step, sheet };
    case StepKind.SetConditional:
      return {
        ...step,
        sheet,
        formats: formatsMapped(step.formats, formula),
        base: optional(step.base, (base) => formatsMapped(base, formula)),
      };
    case StepKind.SetLayout:
      return {
        ...step,
        sheet,
        layout: mappedLayout(step.layout),
        base: optional(step.base, mappedLayout),
      };
    case StepKind.SetPivot:
      return { ...step, sheet, pivot: optional(step.pivot, mappedPivot) };
    case StepKind.PutPivot:
      return {
        ...step,
        sheet,
        pivot: optional(step.pivot, mappedPivot),
        cells: optional(step.cells, (cells) => cellsMapped(cells, formula)),
        layout: optional(step.layout, mappedLayout),
        base: optional(step.base, mappedLayout),
      };
  }
};

const tableMapped = (table: TableSpec, map: SheetMap): TableSpec | undefined => {
  const sheet = map(table.sheet);

  return sheet === undefined ? undefined : { ...table, sheet };
};

const keyedSource =
  (scope: Scope): SourceMap =>
  (source) =>
    source.kind === PivotSourceKind.Range
      ? { ...source, sheet: scope.keyOf(source.sheet) ?? `${ABSENT}${source.sheet}` }
      : source;

const localSource =
  (map: SheetMap): SourceMap =>
  (source) => {
    if (source.kind !== PivotSourceKind.Range) {
      return source;
    }

    const sheet = map(source.sheet);

    return sheet === undefined ? LOST_SOURCE : { ...source, sheet };
  };

const KEYED: Direction = {
  sheet: (scope) => scope.keyOf,
  scoped: (_sheet, mapped) => mapped,
  formula: (scope) => (name) => scope.keyOf(name) ?? `${ABSENT}${name}`,
  source: (scope) => keyedSource(scope),
};

const LOCAL: Direction = {
  sheet: (scope) => scope.nameOf,
  scoped: (sheet) => sheet,
  formula: (scope) => (sheet) =>
    sheet.startsWith(ABSENT) ? sheet.slice(ABSENT.length) : scope.nameOf(sheet),
  source: (_scope, formula) => localSource(formula),
};

const passOf = (direction: Direction, scope: Scope): Pass => {
  const formula = direction.formula(scope);

  return {
    scope,
    sheet: direction.sheet(scope),
    scoped: direction.scoped,
    mapping: { formula, source: direction.source(scope, formula) },
  };
};

const batchMapped = (
  step: StepOf<typeof StepKind.Batch>,
  part: (step: WorkbookStep) => WorkbookStep | undefined,
): WorkbookStep | undefined => {
  const steps = step.steps.reduce<WorkbookStep[]>((kept, each) => {
    const mapped = part(each);

    if (mapped !== undefined) {
      kept.push(mapped);
    }
    return kept;
  }, []);

  return steps.length === 0 ? undefined : { ...step, steps };
};

const sheetAdded = (
  step: StepOf<typeof StepKind.AddSheet>,
  pass: Pass,
): WorkbookStep | undefined => {
  if (step.key === undefined) {
    return undefined;
  }
  pass.scope.add(step.name, step.key);
  return step;
};

const sheetRemoved = (
  step: StepOf<typeof StepKind.RemoveSheet>,
  pass: Pass,
): WorkbookStep | undefined => {
  const mapped = pass.sheet(step.name);

  if (mapped === undefined) {
    return undefined;
  }
  pass.scope.remove(pass.scoped(step.name, mapped));
  return { ...step, name: mapped };
};

const sheetRenamed = (
  step: StepOf<typeof StepKind.RenameSheet>,
  pass: Pass,
): WorkbookStep | undefined => {
  const mapped = pass.sheet(step.from);

  if (mapped === undefined) {
    return undefined;
  }
  pass.scope.rename(pass.scoped(step.from, mapped), step.to);
  return { ...step, from: mapped };
};

const nameSet = (step: StepOf<typeof StepKind.SetName>, pass: Pass): WorkbookStep | undefined => {
  const home = optional(step.scope, pass.sheet);

  if (step.scope !== undefined && home === undefined) {
    return undefined;
  }
  return {
    ...step,
    scope: home,
    ast: optional(step.ast, (ast) => sheetsMapped(ast, pass.mapping.formula)),
  };
};

const tableAdded = (
  step: StepOf<typeof StepKind.AddTable>,
  pass: Pass,
): WorkbookStep | undefined => {
  const table = tableMapped(step.table, pass.sheet);

  return table === undefined ? undefined : { ...step, table };
};

const tableSet = (step: StepOf<typeof StepKind.SetTable>, pass: Pass): WorkbookStep | undefined => {
  const table = optional(step.table, (each) => tableMapped(each, pass.sheet));

  return step.table !== undefined && table === undefined ? undefined : { ...step, table };
};

const sheetPart = (step: SheetStep, pass: Pass): WorkbookStep | undefined => {
  const sheet = pass.sheet(step.sheet);

  return sheet === undefined ? undefined : sheetBody(step, sheet, pass.mapping);
};

const partOf = (step: WorkbookStep, pass: Pass): WorkbookStep | undefined => {
  switch (step.kind) {
    case StepKind.AddSheet:
      return sheetAdded(step, pass);
    case StepKind.RemoveSheet:
      return sheetRemoved(step, pass);
    case StepKind.RenameSheet:
      return sheetRenamed(step, pass);
    case StepKind.SetName:
      return nameSet(step, pass);
    case StepKind.AddTable:
      return tableAdded(step, pass);
    case StepKind.SetTable:
      return tableSet(step, pass);
    case StepKind.RenameTable:
      return step;
    case StepKind.Batch:
      return batchMapped(step, (part) => partOf(part, pass));
    default:
      return sheetPart(step, pass);
  }
};

export const keyedStep = (step: WorkbookStep, names: SheetNames): WorkbookStep | undefined =>
  partOf(step, passOf(KEYED, scopeOver(names)));

export const localStep = (step: WorkbookStep, names: SheetNames): WorkbookStep | undefined =>
  partOf(step, passOf(LOCAL, scopeOver(names)));

export const keyedLayout = (layout: SheetLayout, names: SheetNames): SheetLayout =>
  layoutMapped(layout, (name) => names.keyOf(name) ?? `${ABSENT}${name}`);

const keyedChangesOf = (part: WorkbookStep, pass: Pass): readonly RemoteChange[] => {
  switch (part.kind) {
    case StepKind.AddSheet:
    case StepKind.RemoveSheet:
    case StepKind.RenameSheet:
      partOf(part, pass);
      return [];
    case StepKind.InsertLines:
    case StepKind.DeleteLines: {
      const sheet = pass.sheet(part.sheet);

      return sheet === undefined ? [] : changesOf({ ...part, sheet });
    }
    case StepKind.RenameTable:
      return changesOf(part);
    default:
      return [];
  }
};

export const keyedChanges = (step: WorkbookStep, names: SheetNames): readonly RemoteChange[] => {
  const pass = passOf(KEYED, scopeOver(names));
  const changes: RemoteChange[] = [];

  for (const part of flattened(step)) {
    for (const change of keyedChangesOf(part, pass)) {
      changes.push(change);
    }
  }
  return changes;
};

export const localLines = (
  lines: readonly LineChange[],
  names: SheetNames,
): readonly LineChange[] =>
  lines.reduce<LineChange[]>((local, line) => {
    const sheet = names.nameOf(line.sheet);

    if (sheet !== undefined) {
      local.push({ ...line, sheet });
    }
    return local;
  }, []);

export const localChanges = (
  changes: readonly RemoteChange[],
  names: SheetNames,
): readonly RemoteChange[] =>
  changes.reduce<RemoteChange[]>((local, change) => {
    if (change.kind !== RemoteChangeKind.Lines) {
      local.push(change);
      return local;
    }

    const sheet = names.nameOf(change.change.sheet);

    if (sheet !== undefined) {
      local.push({ ...change, change: { ...change.change, sheet } });
    }
    return local;
  }, []);
