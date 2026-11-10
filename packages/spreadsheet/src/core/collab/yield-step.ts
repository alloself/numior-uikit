import { containsCell } from '../address';
import type { CellRange } from '../cell.types';
import { cellKey } from '../steps/contents';
import { StepKind, type CellEdit, type WorkbookStep } from '../steps/step.types';
import { stepOver } from './rebase-queue';
import { changesOf } from './remote-change';
import { flattened } from './schema';

interface Touches {
  readonly cells: ReadonlyMap<string, ReadonlyMap<number, CellEdit>>;
  readonly formats: ReadonlyMap<string, readonly CellRange[]>;
}

const indexes = new WeakMap<readonly WorkbookStep[], Touches>();

const sheetKey = (name: string): string => name.toLowerCase();

const touchesOf = (touched: readonly WorkbookStep[]): Touches => {
  const known = indexes.get(touched);

  if (known !== undefined) {
    return known;
  }
  const cells = new Map<string, Map<number, CellEdit>>();
  const formats = new Map<string, CellRange[]>();

  touched.forEach((step) => {
    if (step.kind === StepKind.SetCells) {
      const sheet = cells.get(sheetKey(step.sheet)) ?? new Map<number, CellEdit>();

      step.cells.forEach((cell) => {
        const key = cellKey(cell.row, cell.col);

        sheet.set(key, { ...sheet.get(key), ...cell });
      });

      cells.set(sheetKey(step.sheet), sheet);
    } else if (step.kind === StepKind.SetFormat) {
      formats.set(sheetKey(step.sheet), [...(formats.get(sheetKey(step.sheet)) ?? []), step.range]);
    }
  });

  const built = { cells, formats };

  indexes.set(touched, built);
  return built;
};

const yieldedEdit = (
  edit: CellEdit,
  theirs: CellEdit | undefined,
  ranges: readonly CellRange[],
): CellEdit | undefined => {
  const formatted =
    theirs?.format !== undefined || ranges.some((range) => containsCell(range, edit.row, edit.col));

  if (theirs === undefined && !formatted) {
    return edit;
  }
  const content = theirs?.content === undefined ? edit.content : undefined;
  const format = formatted ? undefined : edit.format;
  const decoration = theirs?.decoration === undefined ? edit.decoration : undefined;

  if (content === undefined && format === undefined && decoration === undefined) {
    return undefined;
  }
  return content === edit.content && format === edit.format && decoration === edit.decoration
    ? edit
    : { row: edit.row, col: edit.col, content, format, decoration };
};

export const foreignEdits = (
  steps: readonly WorkbookStep[],
  local: readonly WorkbookStep[],
): readonly WorkbookStep[] => {
  const later = local.flatMap(changesOf);

  return steps
    .flatMap(flattened)
    .reduceRight<WorkbookStep[]>((found, part) => {
      if (part.kind === StepKind.SetCells || part.kind === StepKind.SetFormat) {
        const moved = stepOver(part, later);

        if (moved !== undefined) {
          found.push(moved);
        }
      }
      later.unshift(...changesOf(part));
      return found;
    }, [])
    .toReversed();
};

export const touchedOver = (
  touched: readonly WorkbookStep[],
  step: WorkbookStep,
): readonly WorkbookStep[] => {
  const changes = changesOf(step);

  return changes.length === 0
    ? touched
    : touched.reduce<WorkbookStep[]>((kept, edit) => {
        const moved = stepOver(edit, changes);

        if (moved !== undefined) {
          kept.push(moved);
        }
        return kept;
      }, []);
};

export const yieldStep = (
  step: WorkbookStep,
  touched: readonly WorkbookStep[],
): WorkbookStep | undefined => {
  if (step.kind === StepKind.Batch) {
    const steps = step.steps.reduce<WorkbookStep[]>((kept, part) => {
      const left = yieldStep(part, touched);

      if (left !== undefined) {
        kept.push(left);
      }
      return kept;
    }, []);

    if (steps.length === 0) {
      return undefined;
    }
    return steps.length === step.steps.length &&
      steps.every((part, index) => part === step.steps[index])
      ? step
      : { ...step, steps };
  }
  if (step.kind !== StepKind.SetCells) {
    return step;
  }
  const touches = touchesOf(touched);
  const theirs = touches.cells.get(sheetKey(step.sheet));
  const ranges = touches.formats.get(sheetKey(step.sheet)) ?? [];

  if (theirs === undefined && ranges.length === 0) {
    return step;
  }

  const cells = step.cells.reduce<CellEdit[]>((kept, edit) => {
    const left = yieldedEdit(edit, theirs?.get(cellKey(edit.row, edit.col)), ranges);

    if (left !== undefined) {
      kept.push(left);
    }
    return kept;
  }, []);

  if (cells.length === 0) {
    return undefined;
  }
  return cells.length === step.cells.length &&
    cells.every((edit, index) => edit === step.cells[index])
    ? step
    : { ...step, cells };
};
