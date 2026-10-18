import type { Doc, DocJSON, ElementNode, NodeId, Schema } from '@numior/editor-core';
import type { Component } from 'vue';

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

export type NuiContentAlign = 'start' | 'center' | 'end';

export type NuiContentWrap = 'inline' | 'wrap' | 'break';

export type NuiContentSize = 'sm' | 'md' | 'lg';

export type NuiContentTableType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export type NuiContentCellValue = string | number | boolean | null;

export type NuiContentTextFilterOp = 'contains' | 'equals' | 'starts' | 'empty';

export type NuiContentTableFilter =
  | { readonly kind: 'text'; readonly op: NuiContentTextFilterOp; readonly value: string }
  | { readonly kind: 'number'; readonly min: number | null; readonly max: number | null }
  | { readonly kind: 'date'; readonly from: string | null; readonly to: string | null }
  | { readonly kind: 'set'; readonly values: readonly NuiContentCellValue[] };

export type NuiContentSortDirection = 'asc' | 'desc';

export interface NuiContentTableSort {
  readonly column: NodeId;
  readonly direction: NuiContentSortDirection;
}

export interface NuiContentTableColumn {
  readonly id: NodeId;
  readonly name: string;
  readonly type: NuiContentTableType;
  readonly width: number | undefined;
  readonly options: readonly string[];
  readonly filter: NuiContentTableFilter | undefined;
}

export interface NuiContentTableRow {
  readonly id: NodeId;
  readonly cells: readonly NuiContentCellValue[];
}

export interface NuiContentTableData {
  readonly id: NodeId;
  readonly columns: readonly NuiContentTableColumn[];
  readonly rows: readonly NuiContentTableRow[];
  readonly sort: readonly NuiContentTableSort[];
}

export type NuiContentViews = Readonly<Record<string, Component>>;

export interface NuiContentViewProps {
  node: ElementNode;
}

export interface NuiContentProps {
  document: Doc | DocJSON;
  schema?: Schema | undefined;
  size?: NuiContentSize | undefined;
  views?: NuiContentViews | undefined;
}
