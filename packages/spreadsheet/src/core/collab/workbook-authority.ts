import { createCalculator } from '../calc/calculator';
import { createStepper } from '../steps/apply-step';
import { bookSteps } from '../steps/book-steps';
import { StepKind, type WorkbookStep } from '../steps/step.types';
import { createStepCodec } from '../wire/step-codec';
import type { WireWorkbookStep } from '../wire/wire.types';
import { createWorkbook } from '../workbook';
import type {
  RemoteChange,
  WorkbookAuthority,
  WorkbookAuthorityOptions,
  WorkbookSnapshot,
} from './collab.types';
import { sheetKeys, keyedStep, localStep } from './keyed-steps';
import { changesOver, stepOver } from './rebase-queue';
import { changesOf } from './remote-change';
import { WORKBOOK_SCHEMA, settleForStep } from './schema';

interface Taken {
  readonly step: WorkbookStep;
  readonly inverse: WorkbookStep;
}

const WINDOW = 4096;

export const workbookAuthority = (
  seed: readonly WorkbookStep[] = [],
  { window = WINDOW }: WorkbookAuthorityOptions = {},
): WorkbookAuthority => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const stepper = createStepper(book, calculator);
  const codec = createStepCodec(book);
  const names = sheetKeys(book);
  let tail: readonly (readonly RemoteChange[])[] = [];
  let shot: WorkbookSnapshot | undefined;

  const applyOne = (step: WorkbookStep): WorkbookStep | undefined => {
    settleForStep(book, calculator, step);

    const result = stepper.apply(step);

    return result.ok ? result.inverse : undefined;
  };

  const take = (keyed: WorkbookStep): Taken | undefined => {
    const local = localStep(keyed, names);
    const inverse = local === undefined ? undefined : applyOne(local);

    return inverse === undefined ? undefined : { step: keyed, inverse };
  };

  const undo = (taken: readonly Taken[]): void => {
    taken.toReversed().forEach(({ inverse }) => stepper.apply(inverse));
  };

  const kept = (taken: readonly Taken[]): readonly WireWorkbookStep[] => {
    if (taken.length > 0) {
      shot = undefined;
    }
    tail = [...tail, ...taken.map(({ step }) => changesOf(step))].slice(-window);
    return taken.map(({ step }) => codec.encode(step));
  };

  seed.forEach((step) => {
    applyOne(step);
  });

  const wired = (steps: readonly WorkbookStep[]): readonly WireWorkbookStep[] =>
    steps.reduce<WireWorkbookStep[]>((wires, step) => {
      const keyed = keyedStep(step, names);

      if (keyed !== undefined) {
        wires.push(codec.encode(keyed));
      }
      return wires;
    }, []);

  return {
    schema: WORKBOOK_SCHEMA,
    snapshot: () => {
      shot ??= { steps: wired(bookSteps(book, calculator)) };
      return shot;
    },
    apply: (wires) => {
      const taken: Taken[] = [];

      for (const wire of wires) {
        const step = codec.decode(wire);
        const done = step === undefined ? undefined : take(step);

        if (done === undefined) {
          undo(taken);
          return false;
        }
        taken.push(done);
      }
      kept(taken);
      return true;
    },
    rebase: (wires, behind) => {
      if (behind > tail.length) {
        return undefined;
      }

      const taken: Taken[] = [];
      let moving: readonly RemoteChange[] = tail.slice(tail.length - behind).flat();

      for (const wire of wires) {
        const step = codec.decode(wire);

        if (step === undefined || (step.kind === StepKind.SetLayout && step.base === undefined)) {
          undo(taken);
          return undefined;
        }

        const moved = stepOver(step, moving);
        const done = moved === undefined ? undefined : take(moved);

        if (done !== undefined) {
          taken.push(done);
        }
        moving = changesOver(moving, changesOf(step));
      }
      return kept(taken);
    },
  };
};
