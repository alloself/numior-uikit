import type { ComputedRef, InjectionKey } from 'vue';
import type { FormulaSegment } from './sheet.types';

export const SHEET_SEGMENTS: InjectionKey<ComputedRef<readonly FormulaSegment[]>> = Symbol(
  'nui-spreadsheet-segments',
);
