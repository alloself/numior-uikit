import type { ElementNode } from '@numior/editor-core';
import type { Component } from 'vue';
import type {
  NuiContentCellValue,
  NuiContentTableColumn,
  NuiContentTableRow,
  NuiContentTableType,
} from '../content/content.types';

export interface NuiContentCellViewProps {
  value: NuiContentCellValue;
  row: NuiContentTableRow;
  column: NuiContentTableColumn;
  label: string;
  editable: boolean;
}

export type NuiContentCellViews = Readonly<Partial<Record<NuiContentTableType, Component>>>;

export interface NuiContentTableProps {
  node: ElementNode;
  editable?: boolean | undefined;
  locale?: string | undefined;
  cells?: NuiContentCellViews | undefined;
}
