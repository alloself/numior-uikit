import type { CellAddress, CellRange } from '../cell.types';

export interface WorkbookUser {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string | undefined;
}

export interface WorkbookSelection {
  readonly active: CellAddress;
  readonly ranges: readonly CellRange[];
}

export interface WorkbookPlace {
  readonly sheet: string;
  readonly selection: WorkbookSelection;
}

export interface WorkbookPresence {
  readonly user: WorkbookUser;
  readonly place: WorkbookPlace | null;
}

export interface WorkbookPeer extends WorkbookPresence {
  readonly clientId: string;
  readonly colour: number;
}
