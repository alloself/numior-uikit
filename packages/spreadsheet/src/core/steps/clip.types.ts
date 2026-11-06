import type { CellAddress, CellRange } from '../cell.types';
import type { CellEdit, WorkbookStep } from './step.types';

export type FillMode = (typeof FillMode)[keyof typeof FillMode];

export interface CellClip {
  readonly sheet: string;
  readonly origin: CellAddress;
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly CellEdit[];
}

export interface ClipPaste {
  readonly step: WorkbookStep;
  readonly area: CellRange;
}

export interface CellClips {
  copy(sheet: string, range: CellRange): CellClip | undefined;
  paste(sheet: string, clip: CellClip, target: CellRange): ClipPaste | undefined;
  move(sheet: string, clip: CellClip, at: CellAddress): ClipPaste | undefined;
  fill(
    sheet: string,
    source: CellRange,
    target: CellRange,
    mode?: FillMode,
  ): WorkbookStep | undefined;
  clear(sheet: string, ranges: readonly CellRange[]): WorkbookStep | undefined;
}

export const FillMode = { Series: 'series', Copy: 'copy' } as const;
