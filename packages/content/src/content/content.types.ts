import type { Doc, DocJSON, ElementNode, NodeId, Schema } from '@numior/editor-core';
import type { Component } from 'vue';
import type { NuiEmbedPresetId, NuiEmbedProvider } from './embeds';

export type NuiContentFileKind = (typeof NuiContentFileKind)[keyof typeof NuiContentFileKind];

export type NuiContentTone = (typeof NuiContentTone)[keyof typeof NuiContentTone];

export type NuiContentColour = (typeof NuiContentColour)[keyof typeof NuiContentColour];

export type NuiContentAlign = (typeof NuiContentAlign)[keyof typeof NuiContentAlign];

export type NuiContentWrap = (typeof NuiContentWrap)[keyof typeof NuiContentWrap];

export type NuiContentSize = (typeof NuiContentSize)[keyof typeof NuiContentSize];

export type NuiContentTableType = (typeof NuiContentTableType)[keyof typeof NuiContentTableType];

export type NuiContentCellValue = string | number | boolean | null;

export type NuiContentTextFilterOp =
  (typeof NuiContentTextFilterOp)[keyof typeof NuiContentTextFilterOp];

export type NuiContentTableFilter =
  | {
      readonly kind: typeof NuiContentTableFilterKind.Text;
      readonly op: NuiContentTextFilterOp;
      readonly value: string;
    }
  | {
      readonly kind: typeof NuiContentTableFilterKind.Number;
      readonly min: number | null;
      readonly max: number | null;
    }
  | {
      readonly kind: typeof NuiContentTableFilterKind.Date;
      readonly from: string | null;
      readonly to: string | null;
    }
  | {
      readonly kind: typeof NuiContentTableFilterKind.Set;
      readonly values: readonly NuiContentCellValue[];
    };

export type NuiContentSortDirection =
  (typeof NuiContentSortDirection)[keyof typeof NuiContentSortDirection];

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
  embeds?: readonly (NuiEmbedPresetId | NuiEmbedProvider)[] | undefined;
}

export const NuiContentTone = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export const NuiContentColour = {
  Gray: 'gray',
  Brown: 'brown',
  Orange: 'orange',
  Yellow: 'yellow',
  Green: 'green',
  Blue: 'blue',
  Purple: 'purple',
  Pink: 'pink',
  Red: 'red',
} as const;

export const NuiContentAlign = { Start: 'start', Center: 'center', End: 'end' } as const;

export const NuiContentWrap = { Inline: 'inline', Wrap: 'wrap', Break: 'break' } as const;

export const NuiContentSize = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;

export const NuiContentTableType = {
  Text: 'text',
  Number: 'number',
  Date: 'date',
  Boolean: 'boolean',
  Select: 'select',
} as const;

export const NuiContentTextFilterOp = {
  Contains: 'contains',
  Equals: 'equals',
  Starts: 'starts',
  Empty: 'empty',
} as const;

export const NuiContentSortDirection = { Asc: 'asc', Desc: 'desc' } as const;

export const NuiContentFileKind = {
  File: 'file',
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
  Pdf: 'pdf',
  Archive: 'archive',
  Sheet: 'sheet',
  Text: 'text',
} as const;

export const NuiContentTableFilterKind = {
  Text: 'text',
  Number: 'number',
  Date: 'date',
  Set: 'set',
} as const;

export const NuiContentNodeType = {
  Doc: 'doc',
  Paragraph: 'paragraph',
  Heading: 'heading',
  Blockquote: 'blockquote',
  BulletList: 'bullet_list',
  OrderedList: 'ordered_list',
  TodoList: 'todo_list',
  ListItem: 'list_item',
  TodoItem: 'todo_item',
  CodeBlock: 'code_block',
  Divider: 'divider',
  Callout: 'callout',
  Toggle: 'toggle',
  Image: 'image',
  File: 'file',
  Columns: 'columns',
  Column: 'column',
  HardBreak: 'hard_break',
  Mention: 'mention',
  Embed: 'embed',
  Bookmark: 'bookmark',
  Table: 'table',
  TableHead: 'table_head',
  TableColumn: 'table_column',
  TableOption: 'table_option',
  TableBody: 'table_body',
  TableRow: 'table_row',
  TableCell: 'table_cell',
  TableFilter: 'table_filter',
  TableValue: 'table_value',
} as const;

export const NuiContentMarkType = {
  Link: 'link',
  Bold: 'bold',
  Italic: 'italic',
  Underline: 'underline',
  Strike: 'strike',
  Code: 'code',
  Color: 'color',
  Highlight: 'highlight',
} as const;

export const ContentTag = { Figure: 'figure', Input: 'input', Li: 'li', Option: 'option' } as const;

export const ContentAttrValue = {
  Checkbox: 'checkbox',
  True: 'true',
  Normal: 'normal',
  Class: 'class',
} as const;

export const YoutubeUrl = { ShortHost: 'youtu.be', Shorts: 'shorts', Embed: 'embed' } as const;

export const UrlProtocol = { Https: 'https:', Http: 'http:' } as const;
