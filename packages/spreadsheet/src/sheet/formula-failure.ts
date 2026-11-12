import {
  FormulaFailureReason,
  localFunction,
  type FormulaFailure,
  type FormulaLocale,
} from '../core';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';

export const formulaFailureText = (
  failure: FormulaFailure,
  messages: NuiSpreadsheetMessages,
  locale: FormulaLocale,
): string => {
  const name = failure.name === undefined ? '' : localFunction(failure.name, locale);

  switch (failure.reason) {
    case FormulaFailureReason.Arguments:
      return messages.formulaArguments({ name });
    case FormulaFailureReason.ReferenceArgument:
      return messages.formulaReference({ name, argument: failure.argument ?? 1 });
    case FormulaFailureReason.LongText:
      return messages.formulaLongText;
    case FormulaFailureReason.BigNumber:
      return messages.formulaBigNumber;
    case FormulaFailureReason.SmallNumber:
      return messages.formulaSmallNumber;
    case FormulaFailureReason.LongFormula:
      return messages.formulaTooLong;
    case FormulaFailureReason.Nesting:
      return messages.formulaNesting;
    case FormulaFailureReason.Depth:
      return messages.formulaDepth;
    default:
      return messages.formulaError({ position: failure.position + 1 });
  }
};
