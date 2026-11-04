import type { NuiFieldControlProps } from '../shared/field-control.types';

export type NuiTextareaResize = (typeof NuiTextareaResize)[keyof typeof NuiTextareaResize];

export type NuiTextareaModifiers = (typeof NuiTextareaModifiers)[keyof typeof NuiTextareaModifiers];

export interface NuiTextareaProps extends NuiFieldControlProps {
  rows?: number | undefined;
  resize?: NuiTextareaResize | undefined;
}

export const NuiTextareaResize = { None: 'none', Vertical: 'vertical', Both: 'both' } as const;

export const NuiTextareaModifiers = { Lazy: 'lazy', Trim: 'trim' } as const;
