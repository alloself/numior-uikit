import type { Component } from 'vue';
import type { NuiSize } from '../shared/scale.types';

export interface NuiPaginationProps {
  total: number;
  siblings?: number | undefined;
  boundaries?: number | undefined;
  edges?: boolean | undefined;
  href?: ((page: number) => string) | undefined;
  as?: string | Component | undefined;
  pageSizes?: readonly number[] | undefined;
  showRange?: boolean | undefined;
  size?: NuiSize | undefined;
  label?: string | undefined;
  previousLabel?: string | undefined;
  nextLabel?: string | undefined;
  firstLabel?: string | undefined;
  lastLabel?: string | undefined;
  pageSizeLabel?: string | undefined;
  pageLabel?: ((page: number) => string) | undefined;
  rangeLabel?: ((from: number, to: number, total: number) => string) | undefined;
}

export interface NuiPaginationControlProps {
  page: number;
  label: string;
  current?: boolean | undefined;
  disabled?: boolean | undefined;
  href?: string | undefined;
  as?: string | Component | undefined;
}
