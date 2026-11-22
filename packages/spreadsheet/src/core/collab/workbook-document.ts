import type { LineChange } from '../formula/rewrite';
import { mergeLayouts } from '../layout/merge-layout';
import { createStepper } from '../steps/apply-step';
import type { WorkbookHistory } from '../steps/history';
import { StepKind, StepRefusal, type StepResult, type WorkbookStep } from '../steps/step.types';
import { createStepCodec } from '../wire/step-codec';
import {
  RemoteChangeKind,
  type RemoteChange,
  type WorkbookDocument,
  type WorkbookDocumentListener,
  type WorkbookDocumentOptions,
} from './collab.types';
import {
  sheetKeys,
  keptNames,
  keyedChanges,
  keyedLayout,
  keyedStep,
  localChanges,
  localLines,
  localStep,
  namesKept,
  type KeptNames,
  type SheetNames,
} from './keyed-steps';
import { freeNames, type TakenNames } from './free-names';
import { changesOver, stepOver } from './rebase-queue';
import { changesOf, linesAfter } from './remote-change';
import { flattened, settleForStep, snapshotSteps } from './schema';
import { foreignEdits, yieldPass } from './yield-step';

interface Unconfirmed {
  readonly step: WorkbookStep;
  readonly inverse: WorkbookStep;
}

interface Taken {
  readonly keyed: WorkbookStep;
  readonly local: WorkbookStep;
  readonly result: StepResult;
  readonly renames: readonly RemoteChange[];
}

interface Received {
  readonly changes: readonly RemoteChange[];
  readonly shown: readonly WorkbookStep[];
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

const SHEET_STEPS: ReadonlySet<WorkbookStep['kind']> = new Set([
  StepKind.AddSheet,
  StepKind.RemoveSheet,
  StepKind.RenameSheet,
]);

const touchesSheets = (step: WorkbookStep): boolean =>
  step.kind === StepKind.Batch ? step.steps.some(touchesSheets) : SHEET_STEPS.has(step.kind);

const withKey = (step: WorkbookStep, key: () => string): WorkbookStep =>
  step.kind === StepKind.AddSheet && step.key === undefined ? { ...step, key: key() } : step;

export const createWorkbookDocument = ({
  book,
  calculator,
  version: initial = null,
}: WorkbookDocumentOptions): WorkbookDocument => {
  const raw = createStepper(book, calculator);
  const codec = createStepCodec(book);
  const names = sheetKeys(book);
  const listeners = new Set<WorkbookDocumentListener>();

  let version = initial;
  let unconfirmed: readonly Unconfirmed[] = [];
  let history: WorkbookHistory | undefined;

  const notify = (steps: readonly WorkbookStep[], moved: readonly RemoteChange[]): void => {
    const lines = localLines(linesAfter(moved), names);

    listeners.forEach((listener) => {
      listener(steps, lines);
    });
  };

  const applied = (step: WorkbookStep): StepResult => {
    settleForStep(book, calculator, step);
    return raw.apply(step);
  };

  const occupied: TakenNames = {
    sheets: names,
    table: (name) => book.names.taken(name) || book.tables.get(name) !== undefined,
  };

  const take = (wire: WorkbookStep): Taken | undefined => {
    const { step: keyed, renames } = freeNames(wire, occupied);
    const local = localStep(keyed, names);

    return local === undefined ? undefined : { keyed, local, result: applied(local), renames };
  };

  const decodedAll = (steps: readonly unknown[]): readonly WorkbookStep[] | undefined =>
    steps.reduce<WorkbookStep[] | undefined>((decoded, wire) => {
      const step = codec.decode(wire);

      return decoded === undefined || step === undefined ? undefined : [...decoded, step];
    }, []);

  const rollback = (sent = 0): readonly RemoteChange[] => {
    const undone: RemoteChange[] = [];
    const kept = unconfirmed.length - sent;

    unconfirmed.toReversed().forEach(({ inverse }, index) => {
      if (index >= kept) {
        for (const change of keyedChanges(inverse, names)) {
          undone.push(change);
        }
      }
      raw.apply(inverse);
    });

    return undone;
  };

  const restore = (): void => {
    unconfirmed.forEach(({ step }) => {
      take(step);
    });
  };

  const withMergedLayout = (
    step: WorkbookStep,
    inverse: WorkbookStep,
    changes: readonly RemoteChange[],
    before: SheetNames,
  ): WorkbookStep => {
    if (step.kind !== StepKind.SetLayout || step.base !== undefined) {
      return step;
    }

    const back = keyedStep(inverse, before);
    const base = back === undefined ? undefined : stepOver(back, changes);
    const sheet = book.keyed(step.sheet);

    return base?.kind === StepKind.SetLayout && base.base !== undefined && sheet !== undefined
      ? { ...step, layout: mergeLayouts(base.layout, base.base, keyedLayout(sheet.layout, names)) }
      : step;
  };

  const replay = (remote: readonly RemoteChange[], before: SheetNames): readonly RemoteChange[] => {
    const replayed: Unconfirmed[] = [];

    const moving = unconfirmed.reduce<readonly RemoteChange[]>((changes, { step, inverse }) => {
      const rebased = stepOver(step, changes);

      const done =
        rebased === undefined
          ? undefined
          : take(withMergedLayout(rebased, inverse, changes, before));

      if (done?.result.ok !== true) {
        return changesOver(changes, changesOf(step));
      }
      replayed.push({ step: done.keyed, inverse: done.result.inverse });
      return [...changesOver(changes, changesOf(step)), ...done.renames];
    }, remote);

    unconfirmed = replayed;
    return moving;
  };

  const applyRemote = (steps: readonly WorkbookStep[]): Received | undefined => {
    const changes: RemoteChange[] = [];
    const inverses: WorkbookStep[] = [];
    const shown: WorkbookStep[] = [];

    for (const step of steps) {
      const taken = take(step);

      if (taken === undefined) {
        continue;
      }
      if (!taken.result.ok) {
        inverses.toReversed().forEach((inverse) => {
          raw.apply(inverse);
        });

        return undefined;
      }
      inverses.push(taken.result.inverse);
      shown.push(taken.local);
      for (const entry of changesOf(taken.keyed)) {
        changes.push(entry);
      }
    }
    return { changes, shown };
  };

  const historyOver = (
    before: KeptNames | undefined,
    moving: readonly RemoteChange[],
  ): ((step: WorkbookStep) => WorkbookStep | undefined) | undefined => {
    if (before === undefined || namesKept(before, book)) {
      const local = localChanges(moving, names);

      return local.length === 0 ? undefined : (step) => stepOver(step, local);
    }
    return (step) => {
      const keyed = keyedStep(step, before);
      const moved = keyed === undefined ? undefined : stepOver(keyed, moving);

      return moved === undefined ? undefined : localStep(moved, names);
    };
  };

  const rebaseHistory = (before: KeptNames | undefined, moving: readonly RemoteChange[]): void => {
    const map = historyOver(before, moving);

    if (map === undefined) {
      return;
    }

    history?.rebase(map);
  };

  const yieldHistory = (steps: readonly WorkbookStep[]): void => {
    const touched = foreignEdits(
      steps,
      unconfirmed.map(({ step }) => step),
    ).reduce<WorkbookStep[]>((local, edit) => {
      const shown = localStep(edit, names);

      if (shown !== undefined) {
        local.push(shown);
      }
      return local;
    }, []);

    history?.trace({ touched, kept: [] }, yieldPass);
  };

  const namesBefore = (steps: readonly WorkbookStep[]): KeptNames | undefined =>
    steps.some(touchesSheets) || unconfirmed.some(({ step }) => touchesSheets(step))
      ? keptNames(book)
      : undefined;

  const refusedLocally = (inverse: WorkbookStep): StepResult => {
    raw.apply(inverse);
    return { ok: false, reason: StepRefusal.MissingSheet };
  };

  return {
    version: () => version,
    pending: () => unconfirmed.map(({ step }) => codec.encode(step)),
    load: (snapshot, at) => {
      const wires = snapshotSteps(snapshot);
      const steps = wires === undefined ? undefined : decodedAll(wires);

      if (steps === undefined) {
        return false;
      }

      const before = raw.clear();
      const remote = applyRemote(steps);

      if (remote === undefined) {
        raw.clear();
        raw.apply(before);
        return false;
      }
      unconfirmed = [];
      version = at;
      history?.clear();
      notify(remote.shown, []);
      return true;
    },
    reset: () => {
      unconfirmed = [];
      version = null;
    },
    receive: (batch) => {
      const steps = decodedAll(batch.steps);

      if (steps === undefined || version === null) {
        return false;
      }

      const before = namesBefore(steps);

      rollback();

      const remote = applyRemote(steps);

      if (remote === undefined) {
        restore();
        return false;
      }
      version += steps.length;

      const moving = replay(remote.changes, before ?? names);

      rebaseHistory(before, moving);
      yieldHistory(steps);
      notify(remote.shown, moving);
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

      const before = namesBefore(steps);
      const undone = rollback(count);
      const remote = applyRemote(steps);

      if (remote === undefined) {
        restore();
        return false;
      }
      unconfirmed = unconfirmed.slice(count);
      version = at;

      const moving = replay([...undone, ...remote.changes], before ?? names);

      rebaseHistory(before, moving);
      notify([...sent.toReversed().map(({ inverse }) => inverse), ...remote.shown], moving);
      return true;
    },
    stepper: {
      apply: (step) => {
        const recorded: Unconfirmed[] = [];
        const changes: RemoteChange[] = [];

        for (const part of flattened(step)) {
          const local = withKey(part, () => book.freshKey());
          const keyed = keyedStep(local, names);
          const done = applied(local);
          const result = done.ok && keyed === undefined ? refusedLocally(done.inverse) : done;

          if (!result.ok || keyed === undefined) {
            recorded.toReversed().forEach(({ inverse }) => {
              raw.apply(inverse);
            });

            return result;
          }
          recorded.push({ step: keyed, inverse: result.inverse });
          for (const entry of changesOf(local)) {
            changes.push(entry);
          }
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
