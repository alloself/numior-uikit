import type { NuiTableCellIcon } from '@numior/table';
import type { ComputedRef } from 'vue';
import type {
  BookLocale,
  CellAddress,
  CellRange,
  ConditionalFormat,
  FontStyle,
  FormulaNode,
  PlacedRule,
  SignatureOf,
  ThemePalette,
} from '../../core';
import type { StyleColor } from '../../core/decorations';
import type {
  CellIsOperator,
  ConditionalRule,
  ConditionalRuleKind,
  DifferentialStyle,
  RuleDraft,
  TextOperator,
  TimePeriod,
} from '../../core/conditional/conditional.types';
import type { NuiSpreadsheetRuleEditorMessages } from './rule-editor.messages';
import type { NuiSpreadsheetRulesMessages } from './rules.messages';

export type ValueTestKind =
  | typeof ConditionalRuleKind.Duplicates
  | typeof ConditionalRuleKind.Uniques
  | typeof ConditionalRuleKind.Blanks
  | typeof ConditionalRuleKind.Filled
  | typeof ConditionalRuleKind.Errors
  | typeof ConditionalRuleKind.NoErrors;

export type RulePreviewKind = (typeof RulePreviewKind)[keyof typeof RulePreviewKind];

export interface RulePreview {
  readonly kind: RulePreviewKind;
  readonly style: Readonly<Record<string, string>>;
  readonly icons: readonly NuiTableCellIcon[];
}

export interface RuleRow {
  readonly key: string;
  readonly index: number;
  readonly placed: PlacedRule;
  readonly description: string;
  readonly area: string;
  readonly preview: RulePreview;
  readonly editable: boolean;
}

export interface RuleLooks {
  readonly theme: ThemePalette;
  readonly font: FontStyle;
  readonly locale: BookLocale;
  readonly signatures: SignatureOf;
}

export interface SheetRulesProps {
  readonly formats: readonly ConditionalFormat[];
  readonly selection: readonly CellRange[];
  readonly looks: RuleLooks;
  readonly titleId: string;
  readonly readonly?: boolean | undefined;
}

export interface SheetRuleProps {
  readonly row: RuleRow;
  readonly readonly: boolean;
  readonly dragging: boolean;
  readonly gripDisabled: boolean;
  readonly texts: NuiSpreadsheetRulesMessages;
}

export interface RuleRowsOptions {
  readonly formats: () => readonly ConditionalFormat[];
  readonly selection: () => readonly CellRange[];
  readonly only: () => boolean;
  readonly looks: () => RuleLooks;
  readonly texts: ComputedRef<NuiSpreadsheetRulesMessages>;
}

export type RuleFormKind = (typeof RuleFormKind)[keyof typeof RuleFormKind];

export type RuleField = (typeof RuleField)[keyof typeof RuleField];

export type AverageChoice = (typeof AverageChoice)[keyof typeof AverageChoice];

export type FontMark = (typeof FontMark)[keyof typeof FontMark];

export interface CustomLook {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly strike: boolean;
  readonly color: StyleColor | undefined;
  readonly fill: StyleColor | undefined;
}

export interface RuleForm {
  readonly kind: RuleFormKind;
  readonly area: string;
  readonly operator: CellIsOperator;
  readonly first: string;
  readonly second: string;
  readonly formula: string;
  readonly textOperator: TextOperator;
  readonly text: string;
  readonly period: TimePeriod;
  readonly rank: string;
  readonly percent: boolean;
  readonly bottom: boolean;
  readonly average: AverageChoice;
  readonly preset: string;
  readonly custom: CustomLook;
  readonly base: DifferentialStyle;
  readonly colors: readonly StyleColor[];
  readonly iconSet: string;
  readonly showValue: boolean;
  readonly stopIfTrue: boolean;
  readonly source: ConditionalRule | undefined;
}

export type ParsedValue = { readonly ok: true; readonly ast: FormulaNode } | { readonly ok: false };

export interface RuleReading {
  readonly locale: BookLocale;
  readonly origin: CellAddress;
  readonly signatures: SignatureOf;
}

export type RuleFormResult =
  | { readonly ok: true; readonly draft: RuleDraft }
  | { readonly ok: false; readonly field: RuleField };

export interface RuleSwatch {
  readonly key: string;
  readonly color: StyleColor;
  readonly css: string;
  readonly label: string;
}

export interface SheetSwatchesProps {
  readonly theme: ThemePalette;
  readonly label: string;
  readonly texts: NuiSpreadsheetRuleEditorMessages;
  readonly clearable?: boolean | undefined;
}

export interface RuleEditorPartProps {
  readonly texts: NuiSpreadsheetRuleEditorMessages;
  readonly looks: RuleLooks;
  readonly error?: RuleField | undefined;
}

export interface SheetRuleEditorProps extends RuleEditorPartProps {
  readonly title: string;
}

export interface RuleEditing {
  readonly target: PlacedRule | undefined;
  readonly form: RuleForm;
  readonly error: RuleField | undefined;
}

export const RulePreviewKind = {
  Style: 'style',
  Scale: 'scale',
  Bar: 'bar',
  Icons: 'icons',
  Blank: 'blank',
} as const;

export const RuleFormKind = {
  CellIs: 'cellIs',
  Expression: 'expression',
  Text: 'text',
  TimePeriod: 'timePeriod',
  Top: 'top',
  AboveAverage: 'aboveAverage',
  Duplicates: 'duplicates',
  Uniques: 'uniques',
  Blanks: 'blanks',
  Filled: 'filled',
  Errors: 'errors',
  NoErrors: 'noErrors',
  TwoColorScale: 'twoColorScale',
  ThreeColorScale: 'threeColorScale',
  DataBar: 'dataBar',
  IconSet: 'iconSet',
} as const;

export const RuleField = {
  Area: 'area',
  First: 'first',
  Second: 'second',
  Formula: 'formula',
  Text: 'text',
  Rank: 'rank',
} as const;

export const AverageChoice = {
  Above: 'above',
  Below: 'below',
  AboveEqual: 'aboveEqual',
  BelowEqual: 'belowEqual',
} as const;

export const FontMark = { Bold: 'bold', Italic: 'italic', Strike: 'strike' } as const;

export const CUSTOM_PRESET = 'custom';
