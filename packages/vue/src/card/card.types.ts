import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';

export type NuiCardVariant = (typeof NuiCardVariant)[keyof typeof NuiCardVariant];

export type CardActionKind = (typeof CardActionKind)[keyof typeof CardActionKind];
export type NuiCardPadding = (typeof NuiCardPadding)[keyof typeof NuiCardPadding];
export type NuiCardTitleTag = (typeof NuiCardTitleTag)[keyof typeof NuiCardTitleTag];

export interface NuiCardProps {
  variant?: NuiCardVariant | undefined;
  padding?: NuiCardPadding | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  as?: string | Component | undefined;
  interactive?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
  loading?: boolean | undefined;
}

export interface NuiCardContentProps {
  lines?: number | undefined;
}

export interface NuiCardTitleProps {
  as?: NuiCardTitleTag | undefined;
}

export interface NuiCardMediaProps {
  src?: string | undefined;
  alt?: string | undefined;
  aspect?: string | undefined;
}

export const NuiCardVariant = { Outline: 'outline', Elevated: 'elevated', Soft: 'soft' } as const;

export const NuiCardPadding = { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg' } as const;

export const NuiCardTitleTag = { H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h5', H6: 'h6' } as const;

export const CardActionKind = { Link: 'link', Button: 'button' } as const;
