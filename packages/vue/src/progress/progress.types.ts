import type { NuiSize, NuiTone } from '../shared/types';

export interface NuiProgressProps {
  value?: number | undefined;
  max?: number | undefined;
  size?: NuiSize | undefined;
  tone?: NuiTone | undefined;
  label?: string | undefined;
  valueText?: string | undefined;
  id?: string | undefined;
}
