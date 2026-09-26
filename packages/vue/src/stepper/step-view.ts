import type { IconAlias } from '@numior/primitives';
import type { NuiStepperStatus, NuiStepperStep } from './stepper.types';

export interface StepView {
  readonly step: NuiStepperStep;
  readonly current: boolean;
  readonly status: NuiStepperStatus;
  readonly clickable: boolean;
  readonly interactive: boolean;
  readonly mark: IconAlias | undefined;
}

const MARKS: Record<NuiStepperStatus, IconAlias | undefined> = {
  upcoming: undefined,
  complete: 'check',
  error: 'x',
};

export const stepViews = (
  steps: readonly NuiStepperStep[],
  currentIndex: number,
  linear: boolean,
): StepView[] =>
  steps.map((step, index) => {
    const current = index === currentIndex;
    const status = step.status ?? (index < currentIndex ? 'complete' : 'upcoming');
    const reachable = linear ? index < currentIndex : true;
    const clickable = !current && step.disabled !== true && reachable;

    return {
      step,
      current,
      status,
      clickable,
      interactive: clickable || current || step.disabled === true,
      mark: MARKS[status],
    };
  });
