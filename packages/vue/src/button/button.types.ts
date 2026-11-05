import type { IconSource } from '@numior/primitives';
import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';
import { NuiSize, type NuiTone } from '../shared/scale.types';

export type NuiButtonVariant = (typeof NuiButtonVariant)[keyof typeof NuiButtonVariant];

export type NuiButtonSize = (typeof NuiButtonSize)[keyof typeof NuiButtonSize];

export type NuiButtonType = HTMLButtonElement['type'];

export interface NuiButtonProps {
  variant?: NuiButtonVariant | undefined;
  tone?: NuiTone | undefined;
  size?: NuiButtonSize | undefined;
  type?: NuiButtonType | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  iconOnly?: boolean | undefined;
  round?: boolean | undefined;
  grip?: boolean | undefined;
  icon?: IconSource | undefined;
  iconEnd?: IconSource | undefined;
  as?: string | Component | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
}

export const NuiButtonVariant = {
  Solid: 'solid',
  Soft: 'soft',
  Outline: 'outline',
  Ghost: 'ghost',
  Plain: 'plain',
  Link: 'link',
} as const;

export const NuiButtonSize = { Inline: 'inline', Xs: 'xs', ...NuiSize } as const;

export const NuiButtonType = {
  Button: 'button',
  Submit: 'submit',
  Reset: 'reset',
} as const satisfies Record<string, NuiButtonType>;
