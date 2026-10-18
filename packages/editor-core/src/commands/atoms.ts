import type { Doc } from '../doc/doc.types';
import type { ContentNode, ElementNode } from '../model/node.types';
import type { NodeType, Schema } from '../schema/schema.types';
import { nearestCursor } from '../state/selection';
import type { Selection } from '../state/selection.types';

export const ATOM = '￼';

export const isInline = (schema: Schema, node: ContentNode): boolean =>
  schema.nodes.get(node.kind === 'element' ? node.type : 'text')?.inline !== false;

const typeOf = (schema: Schema, node: ContentNode): NodeType | undefined =>
  node.kind === 'element' ? schema.nodes.get(node.type) : undefined;

const breakTypes = new WeakMap<Schema, string | null>();

const probes = (type: NodeType): boolean =>
  type.name !== 'text' &&
  type.inline &&
  type.leaf &&
  Object.values(type.attrs).every((attr) => attr.default !== undefined);

const findBreakType = (schema: Schema): string | null =>
  [...schema.nodes.values()].find(
    (type) => probes(type) && type.render(schema.element(type.name, { id: ATOM })).tag === 'br',
  )?.name ?? null;

export const breakTypeOf = (schema: Schema): string | undefined => {
  const known = breakTypes.get(schema);
  const name = known === undefined ? findBreakType(schema) : known;

  breakTypes.set(schema, name);
  return name ?? undefined;
};

export const isAtom = (schema: Schema, node: ContentNode | undefined): node is ElementNode => {
  const type = node === undefined ? undefined : typeOf(schema, node);

  return (
    node?.kind === 'element' && type !== undefined && type.atom && type.name !== breakTypeOf(schema)
  );
};

export const isBlockAtom = (schema: Schema, node: ContentNode | undefined): node is ElementNode =>
  isAtom(schema, node) && !isInline(schema, node);

export const caretNear = (doc: Doc, pos: number, bias: -1 | 1): Selection => {
  const place = doc.resolve(pos);
  const own = bias < 0 ? place.nodeBefore : place.nodeAfter;
  const other = bias < 0 ? place.nodeAfter : place.nodeBefore;

  if (isBlockAtom(doc.schema, own)) {
    return { kind: 'gap', id: own.id, side: bias < 0 ? 'end' : 'start' };
  }
  if (own === undefined && isBlockAtom(doc.schema, other)) {
    return { kind: 'gap', id: other.id, side: bias < 0 ? 'start' : 'end' };
  }
  return nearestCursor(doc, pos, bias);
};
