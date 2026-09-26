export type NuiStepperOrientation = 'horizontal' | 'vertical';

export type NuiStepperStatus = 'upcoming' | 'complete' | 'error';

export interface NuiStepperStep {
  readonly value: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly status?: NuiStepperStatus | undefined;
  readonly disabled?: boolean | undefined;
}

export interface NuiStepperProps {
  steps: readonly NuiStepperStep[];
  orientation?: NuiStepperOrientation | undefined;
  linear?: boolean | undefined;
  label?: string | undefined;
  completeLabel?: string | undefined;
  errorLabel?: string | undefined;
}
