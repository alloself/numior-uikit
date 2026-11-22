import { StepKind, type WorkbookStep } from '../steps/step.types';
import {
  DEFINED_NAME_LENGTH,
  SHEET_NAME_LENGTH,
  validSheetName,
  validTableName,
} from '../workbook';
import { RemoteChangeKind, type RemoteChange } from './collab.types';
import { scopeOver, type Scope, type SheetNames } from './keyed-steps';

export interface TakenNames {
  readonly sheets: SheetNames;
  readonly table: (name: string) => boolean;
}

export interface FreedStep {
  readonly step: WorkbookStep;
  readonly renames: readonly RemoteChange[];
}

interface NameRule {
  readonly valid: (name: string) => boolean;
  readonly longest: number;
}

interface Freeing {
  readonly scope: Scope;
  readonly table: (name: string) => boolean;
  readonly tables: Set<string>;
  readonly renames: RemoteChange[];
}

const TRAILING_NUMBER = /^(.*?)(\d+)$/u;

const SHEET_RULE: NameRule = { valid: validSheetName, longest: SHEET_NAME_LENGTH };

const TABLE_RULE: NameRule = { valid: validTableName, longest: DEFINED_NAME_LENGTH };

const candidateOf = (stem: string, index: number, rule: NameRule): string => {
  const digits = String(index);
  const plain = `${stem.slice(0, rule.longest - digits.length)}${digits}`;

  return rule.valid(plain) ? plain : `${stem.slice(0, rule.longest - digits.length - 1)}_${digits}`;
};

export const nextFreeName = (
  name: string,
  taken: (candidate: string) => boolean,
  rule: NameRule,
): string => {
  const match = TRAILING_NUMBER.exec(name);
  const stem = match?.[1] ?? name;

  let index = match?.[2] === undefined ? 2 : Number(match[2]) + 1;
  let candidate = candidateOf(stem, index, rule);

  while (taken(candidate)) {
    index += 1;
    candidate = candidateOf(stem, index, rule);
  }
  return candidate;
};

const sheetTaken =
  (scope: Scope, key: string) =>
  (name: string): boolean => {
    const owner = scope.keyOf(name);

    return owner !== undefined && owner !== key;
  };

const tableTaken =
  (freeing: Freeing) =>
  (name: string): boolean =>
    freeing.tables.has(name.toLowerCase()) || freeing.table(name);

const freeSheet = (name: string, key: string, scope: Scope): string => {
  const taken = sheetTaken(scope, key);

  return taken(name) ? nextFreeName(name, taken, SHEET_RULE) : name;
};

const freeTable = (wanted: string, freeing: Freeing): string => {
  const taken = tableTaken(freeing);
  const given = taken(wanted) ? nextFreeName(wanted, taken, TABLE_RULE) : wanted;

  freeing.tables.add(given.toLowerCase());

  if (given !== wanted) {
    freeing.renames.push({ kind: RemoteChangeKind.RenameTable, from: wanted, to: given });
  }
  return given;
};

const freedPart = (step: WorkbookStep, freeing: Freeing): WorkbookStep => {
  switch (step.kind) {
    case StepKind.AddSheet: {
      if (step.key === undefined) {
        return step;
      }

      const name = freeSheet(step.name, step.key, freeing.scope);

      freeing.scope.add(name, step.key);
      return name === step.name ? step : { ...step, name };
    }
    case StepKind.RenameSheet: {
      const to = freeSheet(step.to, step.from, freeing.scope);

      freeing.scope.rename(step.from, to);
      return to === step.to ? step : { ...step, to };
    }
    case StepKind.RemoveSheet:
      freeing.scope.remove(step.name);
      return step;
    case StepKind.AddTable: {
      const name = freeTable(step.name, freeing);

      return name === step.name ? step : { ...step, name };
    }
    case StepKind.RenameTable: {
      const to =
        step.from.toLowerCase() === step.to.toLowerCase() ? step.to : freeTable(step.to, freeing);

      return to === step.to ? step : { ...step, to };
    }
    case StepKind.Batch:
      return { ...step, steps: step.steps.map((part) => freedPart(part, freeing)) };
    default:
      return step;
  }
};

export const freeNames = (step: WorkbookStep, taken: TakenNames): FreedStep => {
  const freeing: Freeing = {
    scope: scopeOver(taken.sheets),
    table: taken.table,
    tables: new Set(),
    renames: [],
  };

  const freed = freedPart(step, freeing);

  return { step: freed, renames: freeing.renames };
};
