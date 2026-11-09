import type { LineChange } from '../formula/rewrite';
import { createStepper } from '../steps/apply-step';
import type { WorkbookHistory } from '../steps/history';
import { StepKind, type StepResult, type WorkbookStep } from '../steps/step.types';
import { createStepCodec } from '../wire/step-codec';
import {
  RemoteChangeKind,
  type RemoteChange,
  type WorkbookDocument,
  type WorkbookDocumentOptions,
} from './collab.types';
import { mergeLayouts } from './merge-layout';
import { rebaseStep } from './rebase-step';
import { changeOver, changesOf } from './remote-change';
import { flattened, settleForStep, snapshotSteps } from './schema';

interface Unconfirmed {
  readonly step: WorkbookStep;
  readonly inverse: WorkbookStep;
}

const stepOver = (step: WorkbookStep, changes: readonly RemoteChange[]): WorkbookStep | undefined =>
  changes.reduce<WorkbookStep | undefined>(
    (current, change) => (current === undefined ? undefined : rebaseStep(current, change)),
    step,
  );

const changesOver = (
  changes: readonly RemoteChange[],
  local: readonly RemoteChange[],
): readonly RemoteChange[] =>
  local.reduce<readonly RemoteChange[]>(
    (moving, own) =>
      moving.reduce<RemoteChange[]>((kept, change) => {
        const moved = changeOver(change, own);

        if (moved !== undefined) {
          kept.push(moved);
        }
        return kept;
      }, []),
    changes,
  );

const lineChangesOf = (changes: readonly RemoteChange[]): readonly LineChange[] =>
  changes.reduce<LineChange[]>((lines, change) => {
    if (change.kind === RemoteChangeKind.Lines) {
      lines.push(change.change);
    }
    return lines;
  }, []);

export const createWorkbookDocument = ({
  book,
  calculator,
  version: initial = null,
  changed,
}: WorkbookDocumentOptions): WorkbookDocument => {
  const raw = createStepper(book, calculator);
  const codec = createStepCodec(book);

  let version = initial;
  let unconfirmed: readonly Unconfirmed[] = [];
  let history: WorkbookHistory | undefined;

  const applied = (step: WorkbookStep): StepResult => {
    settleForStep(calculator, step);
    return raw.apply(step);
  };

  const decodedAll = (steps: readonly unknown[]): readonly WorkbookStep[] | undefined =>
    steps.reduce<WorkbookStep[] | undefined>((decoded, wire) => {
      const step = codec.decode(wire);

      return decoded === undefined || step === undefined ? undefined : [...decoded, step];
    }, []);

  const rollback = (): void => {
    unconfirmed.toReversed().forEach(({ inverse }) => {
      raw.apply(inverse);
    });
  };

  const withMergedLayout = (
    step: WorkbookStep,
    inverse: WorkbookStep,
    changes: readonly RemoteChange[],
  ): WorkbookStep => {
    if (step.kind !== StepKind.SetLayout) {
      return step;
    }

    const base = stepOver(inverse, changes);
    const sheet = book.sheet(step.sheet);

    return base?.kind === StepKind.SetLayout && sheet !== undefined
      ? { ...step, layout: mergeLayouts(base.layout, step.layout, sheet.layout) }
      : step;
  };

  const replay = (remote: readonly RemoteChange[]): readonly RemoteChange[] => {
    const replayed: Unconfirmed[] = [];

    const moving = unconfirmed.reduce<readonly RemoteChange[]>((changes, { step, inverse }) => {
      const rebased = stepOver(step, changes);

      if (rebased !== undefined) {
        const merged = withMergedLayout(rebased, inverse, changes);
        const result = applied(merged);

        if (result.ok) {
          replayed.push({ step: merged, inverse: result.inverse });
        }
      }
      return changesOver(changes, changesOf(step));
    }, remote);

    unconfirmed = replayed;
    return moving;
  };

  const applyRemote = (steps: readonly WorkbookStep[]): readonly RemoteChange[] | undefined => {
    const changes: RemoteChange[] = [];

    for (const step of steps) {
      if (!applied(step).ok) {
        return undefined;
      }
      changes.push(...changesOf(step));
    }
    return changes;
  };

  return {
    version: () => version,
    pending: () => unconfirmed.map(({ step }) => codec.encode(step)),
    load: (snapshot, at) => {
      const wires = snapshotSteps(snapshot);
      const steps = wires === undefined ? undefined : decodedAll(wires);

      if (steps === undefined || applyRemote(steps) === undefined) {
        return false;
      }
      version = at;
      changed?.(steps);
      return true;
    },
    receive: (batch) => {
      const steps = decodedAll(batch.steps);

      if (steps === undefined || version === null) {
        return false;
      }
      rollback();

      const remote = applyRemote(steps);

      if (remote === undefined) {
        return false;
      }
      version += steps.length;

      const moving = replay(remote);

      history?.rebase((step) => stepOver(step, moving));
      changed?.(steps);
      return true;
    },
    confirm: (count, at) => {
      unconfirmed = unconfirmed.slice(count);
      version = at;
    },
    stepper: {
      apply: (step) => {
        const recorded: Unconfirmed[] = [];
        const changes: RemoteChange[] = [];

        for (const part of flattened(step)) {
          const result = applied(part);

          if (!result.ok) {
            recorded.toReversed().forEach(({ inverse }) => {
              raw.apply(inverse);
            });

            return result;
          }
          recorded.push({ step: part, inverse: result.inverse });
          changes.push(...changesOf(part));
        }
        unconfirmed = [...unconfirmed, ...recorded];

        return {
          ok: true,
          inverse: {
            kind: StepKind.Batch,
            steps: recorded.map(({ inverse }) => inverse).toReversed(),
          },
          changes: lineChangesOf(changes),
        };
      },
    },
    follow: (next) => {
      history = next;
    },
  };
};
