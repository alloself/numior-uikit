import { describe, expect, it } from 'vite-plus/test';
import {
  applyStep,
  stepFromJSON,
  stepToJSON,
  toJSON,
  type Doc,
  type Mark,
  type Step,
} from '../src';
import { createDoc } from '../src/doc/doc';
import { notes, buildWith } from './support/notes';

const { doc, node, text } = buildWith(notes);

const BOLD: Mark = { type: 'bold', attrs: {} };

const SAMPLE: Doc = createDoc(
  notes,
  doc(node('paragraph', ['hello']), node('list', [node('item', [node('paragraph', ['deep'])])])),
);

const overTheWire = (step: Step): unknown => JSON.parse(JSON.stringify(stepToJSON(step)));

const EMPTY = { content: [], openStart: 0, openEnd: 0 } as const;

const STEPS: readonly (readonly [string, Step])[] = [
  [
    'a text replace',
    {
      kind: 'replace',
      from: 1,
      to: 3,
      slice: { content: [text('X', [BOLD])], openStart: 0, openEnd: 0 },
    },
  ],
  [
    'an open replace',
    {
      kind: 'replace',
      from: 6,
      to: 6,
      slice: {
        content: [node('paragraph', ['a']), node('paragraph', ['b'])],
        openStart: 1,
        openEnd: 1,
      },
    },
  ],
  ['an added mark', { kind: 'addMark', from: 1, to: 4, mark: BOLD }],
  [
    'a removed mark with gaps',
    { kind: 'removeMark', from: 1, to: 6, mark: BOLD, skip: [{ from: 2, to: 3 }] },
  ],
  ['attrs', { kind: 'attrs', pos: 7, attrs: {} }],
  [
    'a markup change',
    { kind: 'markup', changes: [{ pos: 0, type: 'heading', attrs: { level: 2 } }] },
  ],
  ['doc attrs', { kind: 'docAttrs', attrs: {} }],
];

const replaceWith = (slice: unknown): unknown => ({ kind: 'replace', from: 1, to: 1, slice });

const REFUSED: readonly (readonly [string, unknown])[] = [
  ['a non-object', 'step'],
  ['an unknown kind', { kind: 'teleport' }],
  ['a negative position', { kind: 'replace', from: -1, to: 1, slice: EMPTY }],
  ['a fractional position', { kind: 'replace', from: 0.5, to: 1, slice: EMPTY }],
  ['a missing slice', { kind: 'replace', from: 1, to: 1 }],
  ['a bad open depth', replaceWith({ content: [], openStart: -1, openEnd: 0 })],
  [
    'a node of an unknown type',
    replaceWith({ content: [{ id: 'a', type: 'alien' }], openStart: 0, openEnd: 0 }),
  ],
  [
    'an open node of an unknown type',
    replaceWith({ content: [{ id: 'a', type: 'alien' }], openStart: 1, openEnd: 0 }),
  ],
  [
    'a closed node with broken content',
    replaceWith({ content: [{ id: 'a', type: 'list' }], openStart: 0, openEnd: 0 }),
  ],
  [
    'a node with a bad attribute',
    replaceWith({
      content: [{ id: 'a', type: 'heading', attrs: { level: 9 } }],
      openStart: 0,
      openEnd: 0,
    }),
  ],
  [
    'an open node with a bad attribute',
    replaceWith({
      content: [{ id: 'a', type: 'heading', attrs: { level: 9 } }],
      openStart: 1,
      openEnd: 1,
    }),
  ],
  [
    'an open node with a foreign mark',
    replaceWith({
      content: [
        { id: 'a', type: 'paragraph', content: [{ text: 'x', marks: [{ type: 'glow' }] }] },
      ],
      openStart: 1,
      openEnd: 1,
    }),
  ],
  ['a malformed node', replaceWith({ content: [7], openStart: 0, openEnd: 0 })],
  [
    'a replace around with a bad gap',
    { kind: 'replaceAround', from: 0, to: 2, gapFrom: 'a', gapTo: 1, slice: EMPTY, insert: 0 },
  ],
  ['a mark of an unknown type', { kind: 'addMark', from: 1, to: 2, mark: { type: 'glow' } }],
  [
    'a mark with a bad attribute',
    { kind: 'addMark', from: 1, to: 2, mark: { type: 'link', attrs: { href: 1, rel: 2 } } },
  ],
  ['a malformed mark', { kind: 'addMark', from: 1, to: 2, mark: 'bold' }],
  ['malformed gaps', { kind: 'addMark', from: 1, to: 2, mark: BOLD, skip: [{ from: 'a', to: 1 }] }],
  ['attrs with an object value', { kind: 'attrs', pos: 0, attrs: { level: {} } }],
  ['attrs without a position', { kind: 'attrs', attrs: {} }],
  ['a malformed markup change', { kind: 'markup', changes: [{ pos: 0, type: 1, attrs: {} }] }],
  ['markup without changes', { kind: 'markup' }],
  ['doc attrs that are not an object', { kind: 'docAttrs', attrs: [] }],
];

describe('step JSON', () => {
  it.each(STEPS)('carries %s over the wire', (_name, step) => {
    const received = stepFromJSON(notes, overTheWire(step));

    expect(received).toBeDefined();
    expect(JSON.parse(JSON.stringify(received))).toEqual(JSON.parse(JSON.stringify(step)));
  });

  it('applies a received step like the original one', () => {
    const step: Step = {
      kind: 'replace',
      from: 1,
      to: 3,
      slice: { content: [text('X')], openStart: 0, openEnd: 0 },
    };

    const received = stepFromJSON(notes, overTheWire(step));

    const applied = received === undefined ? undefined : applyStep(SAMPLE, received);
    const direct = applyStep(SAMPLE, step);

    expect(applied?.ok && toJSON(applied.doc)).toEqual(direct.ok && toJSON(direct.doc));
  });

  it('carries a replace around', () => {
    const step: Step = {
      kind: 'replaceAround',
      from: 0,
      to: 7,
      gapFrom: 1,
      gapTo: 6,
      slice: { content: [node('heading', [], { level: 1 })], openStart: 0, openEnd: 0 },
      insert: 1,
    };

    const received = stepFromJSON(notes, overTheWire(step));

    expect(received).toMatchObject({ kind: 'replaceAround', gapFrom: 1, gapTo: 6, insert: 1 });
  });

  it('accepts an open node with partial content', () => {
    const value = replaceWith({ content: [{ id: 'a', type: 'list' }], openStart: 1, openEnd: 1 });

    expect(stepFromJSON(notes, value)).toBeDefined();
  });

  it.each(REFUSED)('refuses %s', (_name, value) => {
    expect(stepFromJSON(notes, value)).toBeUndefined();
  });
});
