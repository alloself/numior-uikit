export type NuiCollapsibleVariant = 'plain' | 'card';

export type NuiHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface NuiCollapsibleProps {
  id?: string | undefined;
  label?: string | undefined;
  variant?: NuiCollapsibleVariant | undefined;
  headingLevel?: NuiHeadingLevel | undefined;
  disabled?: boolean | undefined;
}

export interface NuiCollapsibleTriggerSlot {
  readonly open: boolean;
}
