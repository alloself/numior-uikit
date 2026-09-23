import type { Component } from 'vue';
import type { NuiTone } from '../shared/types';

export type NuiLinkUnderline = 'always' | 'hover' | 'none';

export interface NuiLinkProps {
  as?: string | Component | undefined;
  href?: string | undefined;
  to?: unknown;
  tone?: NuiTone | undefined;
  underline?: NuiLinkUnderline | undefined;
  external?: boolean | undefined;
  disabled?: boolean | undefined;
}
