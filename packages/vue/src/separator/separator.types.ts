export type NuiSeparatorOrientation = 'horizontal' | 'vertical';

export interface NuiSeparatorProps {
  orientation?: NuiSeparatorOrientation | undefined;
  decorative?: boolean | undefined;
  label?: string | undefined;
}
