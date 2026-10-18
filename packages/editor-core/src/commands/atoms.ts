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

const blockAtom = (doc: Doc, pos: number, bias: -1 | 1): ElementNode | undefined => {
  const place = doc.resolve(pos);
  const beside = bias < 0 ? place.nodeBefore : place.nodeAfter;

  return isAtom(doc.schema, beside) && !isInline(doc.schema, beside) ? beside : undefined;
};

const hasSide = (doc: Doc, pos: number, bias: -1 | 1): boolean => {
  const place = doc.resolve(pos);

  return (bias < 0 ? place.nodeBefore : place.nodeAfter) !== undefined;
};

export const selectionNear = (doc: Doc, pos: number, bias: -1 | 1): Selection => {
  const own = blockAtom(doc, pos, bias);
  const other = hasSide(doc, pos, bias) ? undefined : blockAtom(doc, pos, bias < 0 ? 1 : -1);
  const atom = own ?? other;

  return atom === undefined ? nearestCursor(doc, pos, bias) : { kind: 'node', id: atom.id };
};
