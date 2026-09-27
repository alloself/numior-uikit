import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';

export type NuiCardVariant = 'outline' | 'elevated' | 'soft';
export type NuiCardPadding = 'sm' | 'md' | 'lg';
export type NuiCardTitleTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface NuiCardProps {
  variant?: NuiCardVariant | undefined;
  padding?: NuiCardPadding | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  as?: string | Component | undefined;
  interactive?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
}

export interface NuiCardTitleProps {
  as?: NuiCardTitleTag | undefined;
}

export interface NuiCardMediaProps {
  src?: string | undefined;
  alt?: string | undefined;
  aspect?: string | undefined;
}
