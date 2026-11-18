import { inject, provide, type InjectionKey } from 'vue';

export interface StepperContext {
  readonly readonly: () => boolean;
  readonly numerals: () => string;
}

const STEPPER_KEY: InjectionKey<StepperContext> = Symbol('nui:stepper');

export const provideStepper = (context: StepperContext): void => {
  provide(STEPPER_KEY, context);
};

export const useStepper = (): StepperContext => {
  const context = inject(STEPPER_KEY, null);

  if (context === null || !context.readonly()) {
    throw new Error('NuiStepperStep must be rendered inside a readonly NuiStepper');
  }

  return context;
};
