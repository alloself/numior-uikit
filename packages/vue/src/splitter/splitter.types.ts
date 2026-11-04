export type NuiSplitterOrientation =
  (typeof NuiSplitterOrientation)[keyof typeof NuiSplitterOrientation];

export type SplitterStep = (typeof SplitterStep)[keyof typeof SplitterStep];

export interface NuiSplitterProps {
  id?: string | undefined;
  orientation?: NuiSplitterOrientation | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
}

export const NuiSplitterOrientation = { Horizontal: 'horizontal', Vertical: 'vertical' } as const;

export const SplitterStep = { Grow: 'grow', Shrink: 'shrink', Min: 'min', Max: 'max' } as const;
