import { containsCell } from '../address';
import { CellInputKind, LineAxis, type CellRange } from '../cell.types';
import { cellKey } from '../steps/contents';
import { StepKind, type CellEdit, type WorkbookStep } from '../steps/step.types';
import { RemoteChangeKind, type RemoteChange } from './collab.types';
import { changesOver, stepOver } from './rebase-queue';
import { changesOf } from './remote-change';
import { flattened } from './schema';

export interface Yielding {
  readonly touched: readonly WorkbookStep[];
  readonly kept: readonly RemoteChange[];
}

interface YieldTrace {
  readonly step: WorkbookStep | undefined;
  readonly state: Yielding;
}

type LinesStep = Extract<WorkbookStep, { readonly axis: LineAxis }>;

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

const formattedBy = (
  edit: CellEdit,
  theirs: CellEdit | undefined,
  ranges: readonly CellRange[],
): boolean =>
  theirs?.format !== undefined || ranges.some((range) => containsCell(range, edit.row, edit.col));

const keptOf = (edit: CellEdit, theirs: CellEdit | undefined, formatted: boolean): CellEdit => ({
  row: edit.row,
  col: edit.col,
  content: theirs?.content === undefined ? edit.content : undefined,
  format: formatted ? undefined : edit.format,
  decoration: theirs?.decoration === undefined ? edit.decoration : undefined,
});

const sameEdit = (left: CellEdit, right: CellEdit): boolean =>
  left.content === right.content &&
  left.format === right.format &&
  left.decoration === right.decoration;

const yieldedEdit = (
  edit: CellEdit,
  theirs: CellEdit | undefined,
  ranges: readonly CellRange[],
): CellEdit | undefined => {
  const formatted = formattedBy(edit, theirs, ranges);

  if (theirs === undefined && !formatted) {
    return edit;
  }

  const kept = keptOf(edit, theirs, formatted);

  if (kept.content === undefined && kept.format === undefined && kept.decoration === undefined) {
    return undefined;
  }
  return sameEdit(kept, edit) ? edit : kept;
};

export const foreignEdits = (
  steps: readonly WorkbookStep[],
  local: readonly WorkbookStep[],
): readonly WorkbookStep[] => {
  let later = local.flatMap(changesOf);

  return steps
    .flatMap(flattened)
    .reduceRight<WorkbookStep[]>((found, part) => {
      if (part.kind === StepKind.SetCells || part.kind === StepKind.SetFormat) {
        const moved = stepOver(part, later);

        if (moved !== undefined) {
          found.push(moved);
        }
      }
      later = [...changesOf(part), ...later];
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

const isRemoval = (step: WorkbookStep): step is LinesStep => step.kind === StepKind.DeleteLines;

const writtenInto = (removal: LinesStep, touched: readonly WorkbookStep[]): boolean =>
  touched.some(
    (step) =>
      step.kind === StepKind.SetCells &&
      sheetKey(step.sheet) === sheetKey(removal.sheet) &&
      step.cells.some((cell) => {
        const line = removal.axis === LineAxis.Rows ? cell.row : cell.col;

        return (
          cell.content !== undefined &&
          cell.content.kind !== CellInputKind.Empty &&
          line >= removal.at &&
          line < removal.at + removal.count
        );
      }),
  );

const removesForeign = (step: WorkbookStep, touched: readonly WorkbookStep[]): boolean => {
  const parts = flattened(step);
  let current = touched;

  if (current.length === 0 || !parts.some(isRemoval)) {
    return false;
  }

  for (const part of parts) {
    if (isRemoval(part) && writtenInto(part, current)) {
      return true;
    }
    current = touchedOver(current, part);
  }
  return false;
};

const undone = (change: RemoteChange): RemoteChange | undefined => {
  switch (change.kind) {
    case RemoteChangeKind.Lines:
      return { kind: change.kind, change: { ...change.change, count: -change.change.count } };
    case RemoteChangeKind.RenameSheet:
    case RemoteChangeKind.RenameTable:
      return { ...change, from: change.to, to: change.from };
    case RemoteChangeKind.RemoveSheet:
      return undefined;
  }
};

const withoutStep = (step: WorkbookStep): RemoteChange[] =>
  changesOf(step).reduceRight<RemoteChange[]>((back, change) => {
    const inverse = undone(change);

    if (inverse !== undefined) {
      back.push(inverse);
    }
    return back;
  }, []);

export const yieldPass = (state: Yielding, step: WorkbookStep): YieldTrace => {
  const moved = state.kept.length === 0 ? step : stepOver(step, state.kept);

  if (moved === undefined) {
    return { step: undefined, state };
  }
  if (removesForeign(moved, state.touched)) {
    return {
      step: undefined,
      state: { touched: state.touched, kept: [...withoutStep(step), ...state.kept] },
    };
  }

  return {
    step: yieldStep(moved, state.touched),
    state: {
      touched: touchedOver(state.touched, moved),
      kept: changesOver(state.kept, changesOf(step)),
    },
  };
};
