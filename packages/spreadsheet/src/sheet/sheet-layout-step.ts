import { StepKind, layoutDelta, type Sheet, type SheetLayout, type WorkbookStep } from '../core';
import type { SheetEditing } from './sheet.types';

export const layoutStepOf = (sheet: Sheet, next: SheetLayout): WorkbookStep | undefined => {
  const delta = layoutDelta(sheet.layout, next);

  return delta === undefined
    ? undefined
    : { kind: StepKind.SetLayout, sheet: sheet.name, ...delta };
};

export const applyLayout = (
  editing: Pick<SheetEditing, 'apply'>,
  sheet: Sheet,
  next: SheetLayout,
): boolean => {
  const step = layoutStepOf(sheet, next);

  return step !== undefined && editing.apply([step]);
};
