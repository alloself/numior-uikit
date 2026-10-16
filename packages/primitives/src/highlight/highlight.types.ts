export type NuiSyntaxScope =
  | 'keyword'
  | 'string'
  | 'number'
  | 'function'
  | 'type'
  | 'tag'
  | 'attribute'
  | 'property'
  | 'comment'
  | 'punctuation'
  | 'variable';

export interface NuiCodeToken {
  readonly text: string;
  readonly scope?: NuiSyntaxScope | undefined;
}

export type NuiCodeLine = readonly NuiCodeToken[];

export type NuiCodeTokens = readonly NuiCodeLine[] | undefined;

export interface NuiCodeLanguage {
  readonly id: string;
  readonly label: string;
  readonly aliases?: readonly string[] | undefined;
}

export interface NuiHighlighter {
  readonly languages: readonly NuiCodeLanguage[];
  tokens(code: string, language: string): NuiCodeTokens | Promise<NuiCodeTokens>;
}
