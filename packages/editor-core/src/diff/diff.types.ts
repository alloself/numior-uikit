import type { Doc } from '../doc/doc.types';

export interface DocDiff {
  readonly doc: Doc;
  readonly changes: number;
}

export type InlineEditKind = (typeof InlineEditKind)[keyof typeof InlineEditKind];

export type DiffMark = (typeof DiffMark)[keyof typeof DiffMark];

export const DiffMark = { Added: 'diff_added', Removed: 'diff_removed' } as const;

export const InlineEditKind = { Same: 'same', Added: 'added', Removed: 'removed' } as const;
