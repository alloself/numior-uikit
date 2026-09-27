import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';
import type { NuiTone } from '../shared/scale.types';

export type NuiLinkUnderline = 'always' | 'hover' | 'none';

export interface NuiLinkProps {
  as?: string | Component | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  tone?: NuiTone | undefined;
  underline?: NuiLinkUnderline | undefined;
  external?: boolean | undefined;
  disabled?: boolean | undefined;
}
