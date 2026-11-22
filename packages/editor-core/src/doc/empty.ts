import { createIdSource } from '../model/node';
import { ContentNodeKind, type ElementNode, type IdSource } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { createDoc } from './doc';
import type { Doc } from './doc.types';

export const defaultTextblock = (schema: Schema): string | undefined =>
  [...schema.top.content.next.keys()].find((type) => {
    const spec = schema.nodes.get(type);

    return (
      spec?.inlineContent === true &&
      Object.values(spec.attrs).every((attr) => attr.default !== undefined)
    );
  });

export const emptyTextblock = (schema: Schema, id: string): ElementNode | undefined => {
  const name = defaultTextblock(schema);

  return name === undefined ? undefined : schema.element(name, { id });
};

export const createEmptyDoc = (schema: Schema, ids: IdSource = createIdSource('e')): Doc => {
  const block = emptyTextblock(schema, ids.next());

  if (block === undefined) {
    throw new RangeError('The schema has no textblock that can open an empty document');
  }
  return createDoc(schema, schema.element(schema.top.name, { id: ids.next(), content: [block] }));
};

export const isEmptyDoc = (doc: Doc): boolean => {
  const [first, ...rest] = doc.root.content;

  return (
    rest.length === 0 &&
    first?.kind === ContentNodeKind.Element &&
    first.content.length === 0 &&
    doc.schema.nodes.get(first.type)?.inlineContent === true
  );
};
