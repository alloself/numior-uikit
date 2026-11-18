import type { McpLocale } from '../data.types';

export type DiagnosticCode = (typeof DiagnosticCode)[keyof typeof DiagnosticCode];

export type DiagnosticSeverity = (typeof DiagnosticSeverity)[keyof typeof DiagnosticSeverity];

export type StyleTarget = (typeof StyleTarget)[keyof typeof StyleTarget];

export type StylePlace = (typeof StylePlace)[keyof typeof StylePlace];

export interface Diagnostic {
  readonly line: number;
  readonly column: number;
  readonly severity: DiagnosticSeverity;
  readonly code: DiagnosticCode;
  readonly message: string;
  readonly hint: string;
}

export interface CheckInput {
  readonly code: string;
  readonly filename?: string | undefined;
  readonly locale: McpLocale;
}

export interface CheckReport {
  readonly file?: string | undefined;
  readonly diagnostics: readonly Diagnostic[];
}

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface Finding {
  readonly message: string;
  readonly hint: string;
}

export interface ExportSuggestion {
  readonly nearest: string | undefined;
  readonly owners: readonly string[];
}

export interface ValueSuggestion {
  readonly nearest: string | undefined;
  readonly otherProp: string | undefined;
  readonly bindNumber: boolean;
}

export interface Override {
  readonly selector: string;
  readonly className: string;
  readonly target: StyleTarget;
  readonly components: readonly string[];
  readonly props: readonly string[];
  readonly tokens: readonly string[];
}

export interface CheckTexts {
  readonly unknownComponent: (name: string, nearest: string | undefined) => Finding;
  readonly unknownProp: (component: string, prop: string, nearest: string | undefined) => Finding;
  readonly unknownModel: (component: string, model: string, models: readonly string[]) => Finding;
  readonly unknownEvent: (component: string, event: string, nearest: string | undefined) => Finding;
  readonly invalidValue: (
    component: string,
    prop: string,
    value: string,
    values: readonly string[],
    suggestion: ValueSuggestion,
  ) => Finding;
  readonly unknownExport: (source: string, name: string, suggestion: ExportSuggestion) => Finding;
  readonly noDefaultExport: (source: string) => Finding;
  readonly misplacedStyles: (path: string, place: StylePlace) => Finding;
  readonly styleOverride: (override: Override) => Finding;
  readonly parseError: (block: string, reason: string) => Finding;
}

export interface NamedImport extends Position {
  readonly source: string;
  readonly imported: string | undefined;
  readonly local: string;
}

export interface ScriptFacts {
  readonly imports: readonly NamedImport[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface TemplateFacts {
  readonly diagnostics: readonly Diagnostic[];
}

export interface StyleFacts {
  readonly diagnostics: readonly Diagnostic[];
}

export const DiagnosticCode = {
  UnknownComponent: 'unknown-component',
  UnknownProp: 'unknown-prop',
  UnknownEvent: 'unknown-event',
  InvalidValue: 'invalid-value',
  UnknownExport: 'unknown-export',
  MisplacedStyles: 'misplaced-styles',
  StyleOverride: 'style-override',
  ParseError: 'parse-error',
} as const;

export const DiagnosticSeverity = { Error: 'error', Warning: 'warning' } as const;

export const StyleTarget = { Block: 'block', Part: 'part', Modifier: 'modifier' } as const;

export const StylePlace = { Script: 'script', Style: 'style' } as const;
