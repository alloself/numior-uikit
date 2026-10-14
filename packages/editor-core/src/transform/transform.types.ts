import type { Doc, Slice } from '../doc/doc.types';
import type { AttrValue, ContentNode, IdSource, Mark, NodeId } from '../model/node.types';
import type { Mapping } from './mapping.types';
import type { Step, StepResult } from './step.types';

export interface TransformOptions {
  readonly ids?: IdSource | undefined;
}

export interface SplitType {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, AttrValue>> | undefined;
}

export interface Transform {
  readonly before: Doc;
  readonly doc: Doc;
  readonly steps: readonly Step[];
  readonly docs: readonly Doc[];
  readonly mapping: Mapping;
  readonly changed: boolean;
  newId(): NodeId;
  step(step: Step): Transform;
  maybeStep(step: Step): StepResult;
  replace(from: number, to: number, slice?: Slice): Transform;
  insert(pos: number, content: readonly ContentNode[]): Transform;
  delete(from: number, to: number): Transform;
  insertText(text: string, from: number, to?: number, marks?: readonly Mark[]): Transform;
  addMark(from: number, to: number, mark: Mark): Transform;
  removeMark(from: number, to: number, mark?: Mark | string): Transform;
  setNodeAttrs(pos: number, attrs: Readonly<Record<string, AttrValue>>): Transform;
  setDocAttrs(attrs: Readonly<Record<string, AttrValue>>): Transform;
  split(pos: number, depth?: number, after?: SplitType): Transform;
  join(pos: number, depth?: number): Transform;
}
