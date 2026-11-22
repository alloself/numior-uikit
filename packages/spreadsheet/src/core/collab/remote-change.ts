import { sameName, shiftSpan, type LineChange } from '../formula/rewrite';
import { shiftIndex } from '../lines';
import { StepKind, type WorkbookStep } from '../steps/step.types';
import { RemoteChangeKind, type RemoteChange } from './collab.types';
import { flattened } from './schema';

const changeOfStep = (step: WorkbookStep): RemoteChange | undefined => {
  switch (step.kind) {
    case StepKind.InsertLines:
      return {
        kind: RemoteChangeKind.Lines,
        change: { sheet: step.sheet, axis: step.axis, at: step.at, count: step.count },
      };
    case StepKind.DeleteLines:
      return {
        kind: RemoteChangeKind.Lines,
        change: { sheet: step.sheet, axis: step.axis, at: step.at, count: -step.count },
      };
    case StepKind.RenameTable:
      return { kind: RemoteChangeKind.RenameTable, from: step.from, to: step.to };
    default:
      return undefined;
  }
};

export const changesOf = (step: WorkbookStep): readonly RemoteChange[] =>
  flattened(step).reduce<RemoteChange[]>((changes, part) => {
    const change = changeOfStep(part);

    if (change !== undefined) {
      changes.push(change);
    }
    return changes;
  }, []);

const insertionOver = (change: LineChange, local: LineChange): LineChange => ({
  ...change,
  at: shiftIndex(change.at, local) ?? local.at,
});

const deletionOver = (change: LineChange, local: LineChange): LineChange | undefined => {
  const span = shiftSpan([change.at, change.at - change.count - 1], local);

  return span === undefined ? undefined : { ...change, at: span[0], count: span[0] - span[1] - 1 };
};

const linesOver = (change: LineChange, local: LineChange): LineChange | undefined => {
  if (!sameName(change.sheet, local.sheet) || change.axis !== local.axis) {
    return change;
  }
  return change.count > 0 ? insertionOver(change, local) : deletionOver(change, local);
};

export const linesAfter = (changes: readonly RemoteChange[]): readonly LineChange[] =>
  changes.reduce<LineChange[]>((lines, change) => {
    if (change.kind === RemoteChangeKind.Lines) {
      lines.push(change.change);
    }
    return lines;
  }, []);

export const changeOver = (change: RemoteChange, local: RemoteChange): RemoteChange | undefined => {
  if (change.kind !== RemoteChangeKind.Lines || local.kind !== RemoteChangeKind.Lines) {
    return change;
  }

  const moved = linesOver(change.change, local.change);

  return moved === undefined ? undefined : { ...change, change: moved };
};
