import type { Doc, DocJSON, Schema } from '@numior/editor-core';

export type NuiContentTone = 'info' | 'success' | 'warning' | 'error';

export type NuiContentColour =
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export type NuiContentAlign = 'center' | 'start' | 'end' | 'wide';

export type NuiContentSize = 'sm' | 'md' | 'lg';

export interface NuiContentProps {
  document: Doc | DocJSON;
  schema?: Schema | undefined;
  size?: NuiContentSize | undefined;
}
