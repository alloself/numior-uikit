import type { NuiSpreadsheetRuleEditorMessages } from './sheet/rules/rule-editor.messages';
import type { NuiSpreadsheetRulesMessages } from './sheet/rules/rules.messages';
import type { NuiSpreadsheetMessages } from './sheet/spreadsheet.messages';

export interface NuiSpreadsheetPackageMessages {
  readonly spreadsheet: NuiSpreadsheetMessages;
  readonly spreadsheetRules: NuiSpreadsheetRulesMessages;
  readonly spreadsheetRuleEditor: NuiSpreadsheetRuleEditorMessages;
}
