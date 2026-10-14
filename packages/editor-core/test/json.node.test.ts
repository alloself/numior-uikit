import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDoc, fromJSON, toJSON, type DocJSONResult } from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith(fixtureSchema);

const bold = fixtureSchema.mark('bold');
const link = fixtureSchema.mark('link', { href: 'https://numior.test' });

const issuesOf = (result: DocJSONResult) => (result.ok ? [] : result.issues);

const stamped = (root: unknown) => ({ format: 1, schema: { name: 'fixture', version: 1 }, root });

describe('document JSON', () => {
  it('writes a compact versioned tree and reads it back to an equal document', () => {
    const divider = node('divider');

    const source = createDoc(
      fixtureSchema,
      doc(
        node('heading', ['Title'], { level: 2 }),
        node('paragraph', ['plain ', text('strong', [bold]), text('site', [bold, link])]),
        divider,
      ),
    );

    const json = toJSON(source);

    expect(json.format).toBe(1);
    expect(json.schema).toEqual({ name: 'fixture', version: 1 });
    expect(json.root.content?.[2]).toEqual({ id: divider.id, type: 'divider' });
    expect(JSON.parse(JSON.stringify(json))).toEqual(json);

    const read = fromJSON(fixtureSchema, JSON.parse(JSON.stringify(json)));

    expect(read.ok && read.doc.root).toEqual(source.root);
  });

  it('round-trips every generated document through text', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 40 }),
        (seed, blocks) => {
          const source = generateDoc(fixtureSchema, { blocks, seed });
          const read = fromJSON(fixtureSchema, JSON.parse(JSON.stringify(toJSON(source))));

          expect(read.ok && read.doc.root).toEqual(source.root);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('fills default attributes and orders marks by the schema', () => {
    const read = fromJSON(
      fixtureSchema,
      stamped({
        id: 'r',
        type: 'doc',
        content: [
          {
            id: 'h',
            type: 'heading',
            content: [
              { text: 'x', marks: [{ type: 'link', attrs: { href: 'a' } }, { type: 'bold' }] },
            ],
          },
        ],
      }),
    );

    expect(read.ok && toJSON(read.doc).root.content).toEqual([
      {
        id: 'h',
        type: 'heading',
        attrs: { level: 1 },
        content: [{ text: 'x', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'a' } }] }],
      },
    ]);
  });

  it('refuses foreign formats, schemas and malformed trees with the path of each problem', () => {
    expect(issuesOf(fromJSON(fixtureSchema, 'text'))).toEqual([{ kind: 'format' }]);

    expect(
      issuesOf(fromJSON(fixtureSchema, { format: 2, schema: { name: 'fixture', version: 1 } })),
    ).toEqual([{ kind: 'format' }]);

    expect(issuesOf(fromJSON(notes, stamped({ id: 'r', type: 'doc' })))).toEqual([
      {
        kind: 'schema',
        expected: { name: 'document', version: 1 },
        found: { name: 'fixture', version: 1 },
      },
    ]);

    expect(
      issuesOf(
        fromJSON(
          fixtureSchema,
          stamped({
            id: 'r',
            type: 'doc',
            content: [
              {
                id: 'p',
                type: 'paragraph',
                content: [7, { text: 1 }, { text: 'a', marks: 'bold' }],
              },
              { id: 4 },
            ],
          }),
        ),
      ),
    ).toEqual([
      { kind: 'shape', path: [0, 0], field: 'node' },
      { kind: 'shape', path: [0, 1], field: 'text' },
      { kind: 'shape', path: [0, 2], field: 'marks' },
      { kind: 'shape', path: [1], field: 'id' },
      { kind: 'shape', path: [1], field: 'type' },
    ]);
  });

  it('reports the schema issues of a well-formed but invalid tree', () => {
    const result = fromJSON(
      fixtureSchema,
      stamped({
        id: 'r',
        type: 'doc',
        content: [
          { id: 'h', type: 'heading', attrs: { level: 9 } },
          { id: 'h', type: 'paragraph', content: [{ text: 'a', marks: [{ type: 'glow' }] }] },
          { id: 'x', type: 'widget' },
        ],
      }),
    );

    expect(issuesOf(result).map((issue) => issue.kind)).toEqual([
      'content',
      'attr',
      'id',
      'mark',
      'type',
    ]);
  });
});
