import type { NuiFieldControlProps } from '../shared/field-control.types';

export type NuiInputType = (typeof NuiInputType)[keyof typeof NuiInputType];

export type NuiInputModifiers = (typeof NuiInputModifiers)[keyof typeof NuiInputModifiers];

export interface NuiInputProps extends NuiFieldControlProps {
  type?: NuiInputType | undefined;
  mask?: string | undefined;
}

export const NuiInputType = {
  Text: 'text',
  Email: 'email',
  Password: 'password',
  Search: 'search',
  Tel: 'tel',
  Url: 'url',
} as const;

export const NuiInputModifiers = { Lazy: 'lazy', Trim: 'trim', Unmasked: 'unmasked' } as const;
