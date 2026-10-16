import type { NuiCodeLine, NuiHighlighter } from '@numior/primitives';

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
  highlighter?: NuiHighlighter | false | undefined;
}

export interface NuiCodeCopyProps {
  label: string;
  floating?: boolean | undefined;
}

export interface NuiCodeRowProps {
  tokens: NuiCodeLine;
  highlighted?: boolean | undefined;
}
