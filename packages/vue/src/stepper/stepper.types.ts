export type NuiStepperOrientation =
  (typeof NuiStepperOrientation)[keyof typeof NuiStepperOrientation];

export type NuiStepperStatus = (typeof NuiStepperStatus)[keyof typeof NuiStepperStatus];

export interface NuiStepperStepDescriptor {
  readonly value: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly status?: NuiStepperStatus | undefined;
  readonly disabled?: boolean | undefined;
}

export interface NuiStepperProps {
  steps?: readonly NuiStepperStepDescriptor[] | undefined;
  orientation?: NuiStepperOrientation | undefined;
  linear?: boolean | undefined;
  readonly?: boolean | undefined;
  label?: string | undefined;
  completeLabel?: string | undefined;
  errorLabel?: string | undefined;
}

export interface NuiStepperStepProps {
  title?: string | undefined;
}

export const NuiStepperOrientation = { Horizontal: 'horizontal', Vertical: 'vertical' } as const;

export const NuiStepperStatus = {
  Upcoming: 'upcoming',
  Complete: 'complete',
  Error: 'error',
} as const;
