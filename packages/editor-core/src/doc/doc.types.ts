import type { ContentNode, ElementNode, NodeId } from '../model/node.types';
import type { Schema } from '../schema/schema.types';

export interface ResolvedPos {
  readonly pos: number;
  readonly depth: number;
  readonly parent: ElementNode;
  readonly parentOffset: number;
  readonly index: number;
  readonly textOffset: number;
  readonly nodeBefore: ContentNode | undefined;
  readonly nodeAfter: ContentNode | undefined;
  node(depth: number): ElementNode;
  indexAt(depth: number): number;
  start(depth: number): number;
  end(depth: number): number;
  before(depth: number): number;
  after(depth: number): number;
}

export interface Slice {
  readonly content: readonly ContentNode[];
  readonly openStart: number;
  readonly openEnd: number;
}

export type NodeVisitor = (
  node: ContentNode,
  pos: number,
  parent: ElementNode,
  index: number,
) => boolean;

export interface Doc {
  readonly schema: Schema;
  readonly root: ElementNode;
  readonly size: number;
  byId(id: NodeId): ElementNode | undefined;
  positionOf(id: NodeId): number | undefined;
  resolve(pos: number): ResolvedPos;
  nodeAt(pos: number): ContentNode | undefined;
  nodesBetween(from: number, to: number, visit: NodeVisitor): void;
  textBetween(from: number, to: number, separator?: string): string;
  slice(from: number, to: number): Slice;
}
