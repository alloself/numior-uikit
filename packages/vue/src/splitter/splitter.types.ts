export type NuiSplitterOrientation = 'horizontal' | 'vertical';

export interface NuiSplitterProps {
  id?: string | undefined;
  orientation?: NuiSplitterOrientation | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
}
