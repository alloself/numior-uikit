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

interface Scope extends SheetNames {
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

const ABSENT = ':';

const LOST_SOURCE: PivotSource = { kind: PivotSourceKind.Lost };

const scopeOver = (base: SheetNames): Scope => {
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

const sheetBody = (step: SheetStep, sheet: string, mapping: Mapping): WorkbookStep => {
  const { formula, source } = mapping;

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
        base: step.base === undefined ? undefined : formatsMapped(step.base, formula),
      };
    case StepKind.SetLayout:
      return {
        ...step,
        sheet,
        layout: layoutMapped(step.layout, formula),
        base: step.base === undefined ? undefined : layoutMapped(step.base, formula),
      };
    case StepKind.SetPivot:
      return {
        ...step,
        sheet,
        pivot: step.pivot === undefined ? undefined : pivotMapped(step.pivot, source),
      };
    case StepKind.PutPivot:
      return {
        ...step,
        sheet,
        pivot: step.pivot === undefined ? undefined : pivotMapped(step.pivot, source),
        cells: step.cells === undefined ? undefined : cellsMapped(step.cells, formula),
        layout: step.layout === undefined ? undefined : layoutMapped(step.layout, formula),
        base: step.base === undefined ? undefined : layoutMapped(step.base, formula),
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

const batchMapped = (
  step: Extract<WorkbookStep, { readonly kind: typeof StepKind.Batch }>,
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

const keyedPart = (step: WorkbookStep, scope: Scope): WorkbookStep | undefined => {
  const formula: SheetMap = (name) => scope.keyOf(name) ?? `${ABSENT}${name}`;

  switch (step.kind) {
    case StepKind.AddSheet: {
      if (step.key === undefined) {
        return undefined;
      }
      scope.add(step.name, step.key);
      return step;
    }
    case StepKind.RemoveSheet: {
      const key = scope.keyOf(step.name);

      if (key === undefined) {
        return undefined;
      }
      scope.remove(key);
      return { ...step, name: key };
    }
    case StepKind.RenameSheet: {
      const key = scope.keyOf(step.from);

      if (key === undefined) {
        return undefined;
      }
      scope.rename(key, step.to);
      return { ...step, from: key };
    }
    case StepKind.SetName: {
      const home = step.scope === undefined ? undefined : scope.keyOf(step.scope);

      if (step.scope !== undefined && home === undefined) {
        return undefined;
      }
      return {
        ...step,
        scope: home,
        ast: step.ast === undefined ? undefined : sheetsMapped(step.ast, formula),
      };
    }
    case StepKind.AddTable: {
      const table = tableMapped(step.table, scope.keyOf);

      return table === undefined ? undefined : { ...step, table };
    }
    case StepKind.SetTable: {
      const table = step.table === undefined ? undefined : tableMapped(step.table, scope.keyOf);

      return step.table !== undefined && table === undefined ? undefined : { ...step, table };
    }
    case StepKind.RenameTable:
      return step;
    case StepKind.Batch:
      return batchMapped(step, (part) => keyedPart(part, scope));
    default: {
      const key = scope.keyOf(step.sheet);

      return key === undefined
        ? undefined
        : sheetBody(step, key, { formula, source: keyedSource(scope) });
    }
  }
};

const localPart = (step: WorkbookStep, scope: Scope): WorkbookStep | undefined => {
  const formula: SheetMap = (sheet) =>
    sheet.startsWith(ABSENT) ? sheet.slice(ABSENT.length) : scope.nameOf(sheet);

  switch (step.kind) {
    case StepKind.AddSheet: {
      if (step.key === undefined) {
        return undefined;
      }
      scope.add(step.name, step.key);
      return step;
    }
    case StepKind.RemoveSheet: {
      const name = scope.nameOf(step.name);

      if (name === undefined) {
        return undefined;
      }
      scope.remove(step.name);
      return { ...step, name };
    }
    case StepKind.RenameSheet: {
      const name = scope.nameOf(step.from);

      if (name === undefined) {
        return undefined;
      }
      scope.rename(step.from, step.to);
      return { ...step, from: name };
    }
    case StepKind.SetName: {
      const home = step.scope === undefined ? undefined : scope.nameOf(step.scope);

      if (step.scope !== undefined && home === undefined) {
        return undefined;
      }
      return {
        ...step,
        scope: home,
        ast: step.ast === undefined ? undefined : sheetsMapped(step.ast, formula),
      };
    }
    case StepKind.AddTable: {
      const table = tableMapped(step.table, scope.nameOf);

      return table === undefined ? undefined : { ...step, table };
    }
    case StepKind.SetTable: {
      const table = step.table === undefined ? undefined : tableMapped(step.table, scope.nameOf);

      return step.table !== undefined && table === undefined ? undefined : { ...step, table };
    }
    case StepKind.RenameTable:
      return step;
    case StepKind.Batch:
      return batchMapped(step, (part) => localPart(part, scope));
    default: {
      const name = scope.nameOf(step.sheet);

      return name === undefined
        ? undefined
        : sheetBody(step, name, { formula, source: localSource(formula) });
    }
  }
};

export const keyedStep = (step: WorkbookStep, names: SheetNames): WorkbookStep | undefined =>
  keyedPart(step, scopeOver(names));

export const localStep = (step: WorkbookStep, names: SheetNames): WorkbookStep | undefined =>
  localPart(step, scopeOver(names));

export const keyedLayout = (layout: SheetLayout, names: SheetNames): SheetLayout =>
  layoutMapped(layout, (name) => names.keyOf(name) ?? `${ABSENT}${name}`);

const keyedChangesOf = (part: WorkbookStep, scope: Scope): readonly RemoteChange[] => {
  switch (part.kind) {
    case StepKind.AddSheet:
    case StepKind.RemoveSheet:
    case StepKind.RenameSheet:
      keyedPart(part, scope);
      return [];
    case StepKind.InsertLines:
    case StepKind.DeleteLines: {
      const sheet = scope.keyOf(part.sheet);

      return sheet === undefined ? [] : changesOf({ ...part, sheet });
    }
    case StepKind.RenameTable:
      return changesOf(part);
    default:
      return [];
  }
};

export const keyedChanges = (step: WorkbookStep, names: SheetNames): readonly RemoteChange[] => {
  const scope = scopeOver(names);
  const changes: RemoteChange[] = [];

  for (const part of flattened(step)) {
    for (const change of keyedChangesOf(part, scope)) {
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
