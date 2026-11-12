import { StepRefusal } from '../core';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';

export const stepRefusalText = (refusal: StepRefusal, texts: NuiSpreadsheetMessages): string => {
  switch (refusal) {
    case StepRefusal.SheetFull:
      return texts.sheetFull;
    case StepRefusal.PivotOutput:
      return texts.pivotCells;
    default:
      return texts.actionRefused;
  }
};
