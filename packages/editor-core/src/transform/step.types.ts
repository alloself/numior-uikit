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
  | { readonly kind: 'replace'; readonly from: number; readonly to: number; readonly slice: Slice }
  | {
      readonly kind: 'replaceAround';
      readonly from: number;
      readonly to: number;
      readonly gapFrom: number;
      readonly gapTo: number;
      readonly slice: Slice;
      readonly insert: number;
    }
  | {
      readonly kind: 'addMark' | 'removeMark';
      readonly from: number;
      readonly to: number;
      readonly mark: Mark;
      readonly skip?: readonly StepSpan[] | undefined;
    }
  | { readonly kind: 'attrs'; readonly pos: number; readonly attrs: Attrs }
  | { readonly kind: 'markup'; readonly changes: readonly MarkupChange[] }
  | { readonly kind: 'docAttrs'; readonly attrs: Attrs };

export type StepFailure = 'range' | 'depth' | 'content' | 'id' | 'target' | 'attrs';

export type StepResult =
  | { readonly ok: true; readonly doc: Doc }
  | { readonly ok: false; readonly reason: StepFailure };
