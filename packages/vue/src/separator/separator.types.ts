export type NuiSeparatorOrientation =
  (typeof NuiSeparatorOrientation)[keyof typeof NuiSeparatorOrientation];

export interface NuiSeparatorProps {
  orientation?: NuiSeparatorOrientation | undefined;
  decorative?: boolean | undefined;
  label?: string | undefined;
}

export const NuiSeparatorOrientation = { Horizontal: 'horizontal', Vertical: 'vertical' } as const;
