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

export interface NuiCodeProps {
  code: string;
  tokens?: readonly NuiCodeLine[] | undefined;
  language?: string | undefined;
  title?: string | undefined;
  lineNumbers?: boolean | undefined;
  highlight?: readonly number[] | undefined;
  copyable?: boolean | undefined;
  maxLines?: number | undefined;
  wrap?: boolean | undefined;
  copyLabel?: string | undefined;
  copiedLabel?: string | undefined;
  expandLabel?: string | undefined;
  collapseLabel?: string | undefined;
}

export interface NuiCodeCopyProps {
  label: string;
  floating?: boolean | undefined;
}

export interface NuiCodeRowProps {
  tokens: NuiCodeLine;
  highlighted?: boolean | undefined;
}
