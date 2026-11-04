export type NuiCollapsibleVariant =
  (typeof NuiCollapsibleVariant)[keyof typeof NuiCollapsibleVariant];

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

export const NuiCollapsibleVariant = { Plain: 'plain', Card: 'card' } as const;
