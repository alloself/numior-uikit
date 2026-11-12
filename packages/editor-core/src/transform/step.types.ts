import type { Doc, Slice } from '../doc/doc.types';
import type { Attrs, Mark } from '../model/node.types';

export interface StepSpan {
  readonly from: number;
  readonly to: number;
}

export interface MarkupChange {
  readonly pos: number;
  readonly type: string;
  readonly attrs: Attrs;
}

export type Step =
  | {
      readonly kind: typeof StepKind.Replace;
      readonly from: number;
      readonly to: number;
      readonly slice: Slice;
    }
  | {
      readonly kind: typeof StepKind.ReplaceAround;
      readonly from: number;
      readonly to: number;
      readonly gapFrom: number;
      readonly gapTo: number;
      readonly slice: Slice;
      readonly insert: number;
    }
  | {
      readonly kind: typeof StepKind.AddMark | typeof StepKind.RemoveMark;
      readonly from: number;
      readonly to: number;
      readonly mark: Mark;
      readonly skip?: readonly StepSpan[] | undefined;
    }
  | {
      readonly kind: typeof StepKind.Move;
      readonly from: number;
      readonly to: number;
      readonly target: number;
    }
  | { readonly kind: typeof StepKind.Attrs; readonly pos: number; readonly attrs: Attrs }
  | { readonly kind: typeof StepKind.Markup; readonly changes: readonly MarkupChange[] }
  | { readonly kind: typeof StepKind.DocAttrs; readonly attrs: Attrs };

export type StepFailure = (typeof StepFailure)[keyof typeof StepFailure];

export type StepResult =
  | { readonly ok: true; readonly doc: Doc }
  | { readonly ok: false; readonly reason: StepFailure };

export const StepFailure = {
  Range: 'range',
  Depth: 'depth',
  Content: 'content',
  Id: 'id',
  Target: 'target',
  Attrs: 'attrs',
} as const;

export const TokenKind = { Open: 'open', Close: 'close', Text: 'text', Node: 'node' } as const;

export const StepKind = {
  Replace: 'replace',
  ReplaceAround: 'replaceAround',
  AddMark: 'addMark',
  RemoveMark: 'removeMark',
  Move: 'move',
  Attrs: 'attrs',
  Markup: 'markup',
  DocAttrs: 'docAttrs',
} as const;
