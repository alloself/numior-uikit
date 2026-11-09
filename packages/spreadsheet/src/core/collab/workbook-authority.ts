import { createCalculator } from '../calc/calculator';
import { createStepper } from '../steps/apply-step';
import type { WorkbookStep } from '../steps/step.types';
import { createStepCodec } from '../wire/step-codec';
import type { WireWorkbookStep } from '../wire/wire.types';
import { createWorkbook } from '../workbook';
import type { WorkbookAuthority } from './collab.types';
import { WORKBOOK_SCHEMA, settleForStep } from './schema';

export const workbookAuthority = (seed: readonly WorkbookStep[] = []): WorkbookAuthority => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const stepper = createStepper(book, calculator);
  const codec = createStepCodec(book);
  const journal: WireWorkbookStep[] = [];

  const applyOne = (step: WorkbookStep): WorkbookStep | undefined => {
    settleForStep(calculator, step);

    const result = stepper.apply(step);

    return result.ok ? result.inverse : undefined;
  };

  seed.forEach((step) => {
    applyOne(step);
    journal.push(codec.encode(step));
  });

  return {
    schema: WORKBOOK_SCHEMA,
    snapshot: () => ({ steps: journal }),
    apply: (wires) => {
      const inverses: WorkbookStep[] = [];
      const accepted: WireWorkbookStep[] = [];

      for (const wire of wires) {
        const step = codec.decode(wire);
        const inverse = step === undefined ? undefined : applyOne(step);

        if (step === undefined || inverse === undefined) {
          inverses.toReversed().forEach((undo) => stepper.apply(undo));
          return false;
        }
        inverses.push(inverse);
        accepted.push(codec.encode(step));
      }
      journal.push(...accepted);
      return true;
    },
  };
};
