import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { createSchema, type NodeSpec } from '../src';
import { matchesSplice } from '../src/schema/content-match';
import { buildWith, notes } from './support/notes';

const { node } = buildWith();

const blocks = (expression: string) =>
  createSchema({
    nodes: {
      doc: { content: 'block*' },
      box: { content: expression },
      paragraph: { group: 'block', content: 'text*' },
      heading: { group: 'block', content: 'text*' },
      quote: { group: 'block', content: 'block+' },
      text: { inline: true },
    },
  }).nodes.get('box');

const accepts = (expression: string, types: readonly string[]): boolean => {
  let match = blocks(expression)?.content;

  for (const type of types) {
    match = match?.matchType(type);
  }
  return match?.validEnd === true;
};

const schemaWith = (nodes: Readonly<Record<string, NodeSpec>>) => () =>
  createSchema({
    nodes: {
      doc: { content: 'paragraph*' },
      paragraph: { content: 'text*' },
      text: { inline: true },
      ...nodes,
    },
  });

describe('content expressions', () => {
  it('reads sequences, choices, repeats and ranges', () => {
    expect(accepts('paragraph+', [])).toBe(false);
    expect(accepts('paragraph+', ['paragraph', 'paragraph'])).toBe(true);
    expect(accepts('heading paragraph*', ['heading'])).toBe(true);
    expect(accepts('heading paragraph*', ['paragraph'])).toBe(false);
    expect(accepts('paragraph | heading', ['heading'])).toBe(true);
    expect(accepts('paragraph | heading', ['heading', 'paragraph'])).toBe(false);
    expect(accepts('heading? paragraph', ['paragraph'])).toBe(true);
    expect(accepts('paragraph{2,3}', ['paragraph'])).toBe(false);
    expect(accepts('paragraph{2,3}', ['paragraph', 'paragraph', 'paragraph'])).toBe(true);

    expect(accepts('paragraph{2,3}', ['paragraph', 'paragraph', 'paragraph', 'paragraph'])).toBe(
      false,
    );

    expect(accepts('paragraph{2}', ['paragraph', 'paragraph'])).toBe(true);

    expect(accepts('paragraph{2,}', ['paragraph', 'paragraph', 'paragraph', 'paragraph'])).toBe(
      true,
    );

    expect(accepts('(heading paragraph)+', ['heading', 'paragraph', 'heading', 'paragraph'])).toBe(
      true,
    );

    expect(accepts('(heading paragraph)+', ['heading', 'paragraph', 'heading'])).toBe(false);
    expect(accepts('', [])).toBe(true);
    expect(accepts('', ['paragraph'])).toBe(false);
  });

  it('expands groups and settles ambiguous expressions into one automaton', () => {
    expect(accepts('block+', ['quote', 'heading', 'paragraph'])).toBe(true);
    expect(accepts('paragraph* paragraph', [])).toBe(false);
    expect(accepts('paragraph* paragraph', ['paragraph'])).toBe(true);
    expect(accepts('paragraph* paragraph', ['paragraph', 'paragraph', 'paragraph'])).toBe(true);

    expect(accepts('(paragraph | heading)* heading', ['paragraph', 'heading', 'heading'])).toBe(
      true,
    );

    expect([...(blocks('paragraph | heading')?.content.next.keys() ?? [])].toSorted()).toEqual([
      'heading',
      'paragraph',
    ]);
  });

  it('matches whole content arrays, text included', () => {
    const paragraph = notes.nodes.get('paragraph');
    const list = notes.nodes.get('list');

    expect(
      paragraph?.content.matchContent([notes.text('hi'), node('emoji', [], { name: 'wave' })])
        ?.validEnd,
    ).toBe(true);

    expect(paragraph?.content.matchContent([node('paragraph')])).toBeUndefined();
    expect(list?.content.matchContent([])?.validEnd).toBe(false);
    expect(list?.content.matchContent([node('item', [node('paragraph')])])?.validEnd).toBe(true);
  });

  it('rejects broken expressions and unknown names with a syntax error', () => {
    expect(() => blocks('(paragraph')).toThrow(SyntaxError);
    expect(() => blocks('paragraph{3,1}')).toThrow(SyntaxError);
    expect(() => blocks('paragraph{x}')).toThrow(SyntaxError);
    expect(() => blocks('paragraph{2')).toThrow(SyntaxError);
    expect(() => blocks('*')).toThrow(SyntaxError);
    expect(() => blocks('paragraph )')).toThrow(SyntaxError);
    expect(() => blocks('figure+')).toThrow(/Unknown node type or group "figure"/);
    expect(schemaWith({ box: { content: 'text paragraph' } })).toThrow(/mixes inline and block/);

    expect(schemaWith({ ring: { content: 'loop+' }, loop: { content: 'ring+' } })).toThrow(
      /ring, loop/,
    );
  });

  it('checks a splice from the states of the old content as a full match would', () => {
    const schema = createSchema({
      nodes: {
        doc: { content: 'block*' },
        box: { content: 'heading? (paragraph | quote)+ heading*' },
        paragraph: { group: 'block', content: 'text*' },
        heading: { group: 'block', content: 'text*' },
        quote: { group: 'block', content: 'block+' },
        text: { inline: true },
      },
    });

    const box = schema.nodes.get('box');
    const kinds = fc.constantFrom('paragraph', 'heading');
    const elementOf = (type: string) => schema.element(type, { id: type });

    fc.assert(
      fc.property(
        fc.array(kinds, { maxLength: 8 }),
        fc.array(kinds, { maxLength: 3 }),
        fc.nat(8),
        fc.nat(3),
        (types, insertedTypes, at, removed) => {
          const content = types.map(elementOf);
          const inserted = insertedTypes.map(elementOf);
          const from = Math.min(at, content.length);
          const to = Math.min(from + removed, content.length);
          const parent = schema.element('box', { id: 'box', content });
          const spliced = [...content.slice(0, from), ...inserted, ...content.slice(to)];

          expect(
            box === undefined ? undefined : matchesSplice(box.content, parent, from, to, inserted),
          ).toBe(box?.content.matchContent(spliced)?.validEnd === true);
        },
      ),
    );
  });
});
