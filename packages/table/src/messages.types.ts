import type { NuiTableMessages } from './table/table.messages';

export interface NuiTablePackageMessages {
  readonly table: NuiTableMessages;
}

declare module '@numior/primitives' {
  interface NuiMessages extends NuiTablePackageMessages {}
}
