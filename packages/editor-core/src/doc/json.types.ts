import type { Attrs, NodeId } from '../model/node.types';
import { DocIssueKind, type DocIssue } from '../schema/schema.types';
import type { Doc } from './doc.types';

export interface MarkJSON {
  readonly type: string;
  readonly attrs?: Attrs | undefined;
}

export interface TextJSON {
  readonly text: string;
  readonly marks?: readonly MarkJSON[] | undefined;
}

export interface ElementJSON {
  readonly id: NodeId;
  readonly type: string;
  readonly attrs?: Attrs | undefined;
  readonly content?: readonly NodeJSON[] | undefined;
}

export type NodeJSON = TextJSON | ElementJSON;

export interface SliceJSON {
  readonly content: readonly NodeJSON[];
  readonly openStart: number;
  readonly openEnd: number;
}

export interface SchemaStamp {
  readonly name: string;
  readonly version: number;
}

export interface DocJSON {
  readonly format: 1;
  readonly schema: SchemaStamp;
  readonly root: ElementJSON;
}

export type DocJSONIssue =
  | { readonly kind: typeof DocJSONIssueKind.Format }
  | {
      readonly kind: typeof DocJSONIssueKind.Schema;
      readonly expected: SchemaStamp;
      readonly found: SchemaStamp;
    }
  | {
      readonly kind: typeof DocJSONIssueKind.Shape;
      readonly path: readonly number[];
      readonly field: string;
    }
  | DocIssue;

export type DocJSONResult =
  | { readonly ok: true; readonly doc: Doc }
  | { readonly ok: false; readonly issues: readonly DocJSONIssue[] };

export const DocJSONIssueKind = {
  Format: 'format',
  Schema: 'schema',
  Shape: 'shape',
  ...DocIssueKind,
} as const;
