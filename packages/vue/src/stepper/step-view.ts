import type { IconAlias } from '@numior/primitives';
import type { NuiStepperStatus, NuiStepperStepDescriptor } from './stepper.types';

export interface StepTrigger {
  readonly tag: 'button' | 'span';
  readonly type: 'button' | undefined;
}

export interface StepView {
  readonly step: NuiStepperStepDescriptor;
  readonly current: boolean;
  readonly status: NuiStepperStatus;
  readonly clickable: boolean;
  readonly trigger: StepTrigger;
  readonly mark: IconAlias | undefined;
}

export interface StepViewOptions {
  readonly linear: boolean;
  readonly readonly: boolean;
}

const BUTTON: StepTrigger = { tag: 'button', type: 'button' };
const TEXT: StepTrigger = { tag: 'span', type: undefined };

const MARKS: Record<NuiStepperStatus, IconAlias | undefined> = {
  upcoming: undefined,
  complete: 'check',
  error: 'x',
};

export const stepViews = (
  steps: readonly NuiStepperStepDescriptor[],
  currentIndex: number,
  { linear, readonly }: StepViewOptions,
): StepView[] =>
  steps.map((step, index) => {
    const current = index === currentIndex;
    const status = step.status ?? (index < currentIndex ? 'complete' : 'upcoming');
    const reachable = linear ? index < currentIndex : true;
    const clickable = !readonly && !current && step.disabled !== true && reachable;
    const interactive = !readonly && (clickable || current || step.disabled === true);

    return {
      step,
      current,
      status,
      clickable,
      trigger: interactive ? BUTTON : TEXT,
      mark: MARKS[status],
    };
  });
