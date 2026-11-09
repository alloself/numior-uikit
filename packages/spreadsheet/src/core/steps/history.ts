import type { Stepper } from './apply-step';
import type { StepOutcome, WorkbookStep } from './step.types';

export interface WorkbookHistory {
  commit(steps: readonly WorkbookStep[]): StepOutcome;
  undo(): StepOutcome | undefined;
  redo(): StepOutcome | undefined;
  clear(): void;
  rebase(map: (step: WorkbookStep) => WorkbookStep | undefined): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface HistoryOptions {
  readonly limit?: number | undefined;
}

interface Entry {
  readonly steps: readonly WorkbookStep[];
}

const DEFAULT_LIMIT = 100;

const rebased = (
  entries: readonly Entry[],
  map: (step: WorkbookStep) => WorkbookStep | undefined,
): Entry[] =>
  entries.reduce<Entry[]>((kept, entry) => {
    const steps = entry.steps.reduce<WorkbookStep[]>((moved, step) => {
      const next = map(step);

      if (next !== undefined) {
        moved.push(next);
      }
      return moved;
    }, []);

    if (steps.length > 0) {
      kept.push({ steps });
    }
    return kept;
  }, []);

export const createWorkbookHistory = (
  stepper: Stepper,
  { limit = DEFAULT_LIMIT }: HistoryOptions = {},
): WorkbookHistory => {
  const done: Entry[] = [];
  const undone: Entry[] = [];

  const run = (steps: readonly WorkbookStep[]): { outcome: StepOutcome; inverse: Entry } => {
    const result = stepper.apply({ kind: 'batch', steps });

    if (!result.ok) {
      return { outcome: result, inverse: { steps: [] } };
    }

    return { outcome: { ok: true, changes: result.changes }, inverse: { steps: [result.inverse] } };
  };

  const replay = (from: Entry[], to: Entry[]): StepOutcome | undefined => {
    const entry = from.pop();

    if (entry === undefined) {
      return undefined;
    }

    const { outcome, inverse } = run(entry.steps);

    if (outcome.ok) {
      to.push(inverse);
    } else {
      from.push(entry);
    }
    return outcome;
  };

  return {
    commit: (steps) => {
      const { outcome, inverse } = run(steps);

      if (outcome.ok && steps.length > 0) {
        done.push(inverse);
        done.splice(0, Math.max(done.length - limit, 0));
        undone.length = 0;
      }
      return outcome;
    },
    undo: () => replay(done, undone),
    redo: () => replay(undone, done),
    clear: () => {
      done.length = 0;
      undone.length = 0;
    },
    rebase: (map) => {
      done.splice(0, done.length, ...rebased(done, map));
      undone.splice(0, undone.length, ...rebased(undone, map));
    },
    get canUndo() {
      return done.length > 0;
    },
    get canRedo() {
      return undone.length > 0;
    },
  };
};
