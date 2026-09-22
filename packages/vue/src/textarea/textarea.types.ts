import type { NuiFieldControlProps } from '../shared/types';

export type NuiTextareaResize = 'none' | 'vertical' | 'both';

export type NuiTextareaModifiers = 'lazy' | 'trim';

export interface NuiTextareaProps extends NuiFieldControlProps {
  rows?: number | undefined;
  resize?: NuiTextareaResize | undefined;
  readonly?: boolean | undefined;
}
