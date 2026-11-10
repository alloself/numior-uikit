import type { LineChange } from '../formula/rewrite';
import { createStepper } from '../steps/apply-step';
import type { WorkbookHistory } from '../steps/history';
import { StepKind, type StepResult, type WorkbookStep } from '../steps/step.types';
import { createStepCodec } from '../wire/step-codec';
import {
  RemoteChangeKind,
  type RemoteChange,
  type WorkbookDocument,
  type WorkbookDocumentListener,
  type WorkbookDocumentOptions,
} from './collab.types';
import { mergeLayouts } from './merge-layout';
import { changesOver, stepOver } from './rebase-queue';
import { changesOf } from './remote-change';
import { flattened, settleForStep, snapshotSteps } from './schema';
import { foreignEdits, touchedOver, yieldStep } from './yield-step';

interface Unconfirmed {
  readonly step: WorkbookStep;
  readonly inverse: WorkbookStep;
}

const sameWires = (left: readonly unknown[], right: readonly unknown[]): boolean =>
  left.length === right.length &&
  left.every((wire, index) => JSON.stringify(wire) === JSON.stringify(right[index]));

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
}: WorkbookDocumentOptions): WorkbookDocument => {
  const raw = createStepper(book, calculator);
  const codec = createStepCodec(book);
  const listeners = new Set<WorkbookDocumentListener>();

  let version = initial;
  let unconfirmed: readonly Unconfirmed[] = [];
  let history: WorkbookHistory | undefined;

  const notify = (steps: readonly WorkbookStep[]): void => {
    listeners.forEach((listener) => {
      listener(steps);
    });
  };

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

  const restore = (): void => {
    unconfirmed.forEach(({ step }) => {
      applied(step);
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
    const inverses: WorkbookStep[] = [];

    for (const step of steps) {
      const result = applied(step);

      if (!result.ok) {
        inverses.toReversed().forEach((inverse) => {
          raw.apply(inverse);
        });

        return undefined;
      }
      inverses.push(result.inverse);
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
      notify(steps);
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
        restore();
        return false;
      }
      version += steps.length;

      const moving = replay(remote);

      history?.rebase((step) => stepOver(step, moving));

      history?.trace(
        foreignEdits(
          steps,
          unconfirmed.map(({ step }) => step),
        ),
        (touched, step) => ({
          step: yieldStep(step, touched),
          state: touchedOver(touched, step),
        }),
      );

      notify(steps);
      return true;
    },
    confirm: (count, at) => {
      unconfirmed = unconfirmed.slice(count);
      version = at;
    },
    settle: (count, wires, at) => {
      const steps = decodedAll(wires);
      const sent = unconfirmed.slice(0, count);

      if (steps === undefined || version === null) {
        return false;
      }
      if (
        sameWires(
          sent.map(({ step }) => codec.encode(step)),
          wires,
        )
      ) {
        unconfirmed = unconfirmed.slice(count);
        version = at;
        return true;
      }
      rollback();

      const remote = applyRemote(steps);

      if (remote === undefined) {
        restore();
        return false;
      }
      unconfirmed = unconfirmed.slice(count);
      version = at;

      const undone = sent.toReversed().map(({ inverse }) => inverse);
      const moving = replay([...undone.flatMap(changesOf), ...remote]);

      history?.rebase((step) => stepOver(step, moving));
      notify([...undone, ...steps]);
      return true;
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
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
