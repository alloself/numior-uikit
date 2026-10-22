import {
  createIdSource,
  createSchema,
  type AttrValue,
  type ContentNode,
  type ElementNode,
  type Mark,
  type Schema,
} from '../../src';

type Child = ContentNode | string;

export interface NotesBuilder {
  readonly text: (text: string, marks?: readonly Mark[]) => ContentNode;
  readonly node: (
    type: string,
    content?: readonly Child[],
    attrs?: Readonly<Record<string, AttrValue>>,
  ) => ElementNode;
  readonly doc: (...blocks: readonly ElementNode[]) => ElementNode;
}

export const notes = createSchema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1, verify: (value) => value === 1 || value === 2 } },
    },
    list: { group: 'block', content: 'item+' },
    item: { content: 'paragraph block*' },
    image: { group: 'block', attrs: { src: {} } },
    code: { group: 'block', content: 'text*', marks: '' },
    text: { group: 'inline', inline: true },
    emoji: { group: 'inline', inline: true, attrs: { name: {} } },
  },
  marks: {
    bold: { group: 'format' },
    italic: { group: 'format' },
    link: { attrs: { href: {} } },
  },
});

export const buildWith = (schema: Schema = notes): NotesBuilder => {
  const ids = createIdSource('t');

  const node: NotesBuilder['node'] = (type, content = [], attrs = {}) =>
    schema.element(type, {
      id: ids.next(),
      attrs,
      content: content.map((child) => (typeof child === 'string' ? schema.text(child) : child)),
    });

  return {
    text: (text, marks) => schema.text(text, marks),
    node,
    doc: (...blocks) => node('doc', blocks),
  };
};
