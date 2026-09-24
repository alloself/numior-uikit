import type { NuiFieldControlProps } from '../shared/types';

export type NuiInputType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';

export type NuiInputModifiers = 'lazy' | 'trim' | 'unmasked';

export interface NuiInputProps extends NuiFieldControlProps {
  type?: NuiInputType | undefined;
  readonly?: boolean | undefined;
  mask?: string | undefined;
}
