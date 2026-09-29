import type { NuiDataGridMessages } from './data-grid/data-grid.messages';

export interface NuiGridMessages {
  readonly dataGrid: NuiDataGridMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiGridMessages {}
}
