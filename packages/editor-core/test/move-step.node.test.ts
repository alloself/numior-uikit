import { describe, expect, it } from 'vite-plus/test';
import {
  applyStep,
  createDoc,
  createMapping,
  invertStep,
  mapStep,
  stepFromJSON,
  stepMapOf,
  stepToJSON,
  type Doc,
  type Step,
} from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith();

const page = (): Doc =>
  createDoc(
    notes,
    doc(
      node('paragraph', ['Hello']),
      node('paragraph', ['World']),
      node('list', [
        node('item', [node('paragraph', ['ab'])]),
        node('item', [node('paragraph', ['cd'])]),
      ]),
    ),
  );

const HELLO = { from: 0, to: 7 } as const;

const WORLD = { from: 7, to: 14 } as const;

const LIST_START = 14;

const AFTER_AB = 20;

const FIRST_ITEM = { from: 15, to: 21 } as const;

const worldFirst: Step = { kind: 'move', ...WORLD, target: 0 };

const helloSecond: Step = { kind: 'move', ...HELLO, target: 14 };

const worldIntoItem: Step = { kind: 'move', ...WORLD, target: AFTER_AB };

const helloToEnd = (start: Doc): Step => ({ kind: 'move', ...HELLO, target: start.size });

const applied = (target: Doc, step: Step): Doc => {
  const result = applyStep(target, step);

  if (!result.ok) {
    throw new Error(`step failed: ${result.reason}`);
  }
  return result.doc;
};

const textOf = (target: Doc): string => target.textBetween(0, target.size, '|');

const typing = (pos: number): Step => ({
  kind: 'replace',
  from: pos,
  to: pos,
  slice: { content: [text('x')], openStart: 0, openEnd: 0 },
});

const removal = (from: number, to: number): Step => ({
  kind: 'replace',
  from,
  to,
  slice: { content: [], openStart: 0, openEnd: 0 },
});

const wrapping = (from: number, to: number): Step => ({
  kind: 'replaceAround',
  from,
  to,
  gapFrom: from + 1,
  gapTo: to - 1,
  slice: { content: [], openStart: 0, openEnd: 0 },
  insert: 0,
});

const bolding = (from: number, to: number, skip: readonly (readonly [number, number])[]): Step => ({
  kind: 'addMark',
  from,
  to,
  mark: { type: 'bold', attrs: {} },
  skip: skip.map(([start, end]) => ({ from: start, to: end })),
});

const over = (step: Step, earlier: Step): Step | undefined => mapStep(step, stepMapOf(earlier));

const REFUSED: readonly (readonly [string, Step, string])[] = [
  ['a target inside the moved range', { kind: 'move', from: 0, to: 14, target: 7 }, 'range'],
  ['a target at the start of the range', { kind: 'move', ...WORLD, target: 7 }, 'range'],
  ['a target at the end of the range', { kind: 'move', ...WORLD, target: 14 }, 'range'],
  ['an empty range', { kind: 'move', from: 7, to: 7, target: 0 }, 'range'],
  ['a range past the end', { kind: 'move', from: 7, to: 99, target: 0 }, 'range'],
  ['a range that cuts through a block', { kind: 'move', from: 3, to: 10, target: 28 }, 'depth'],
  ['a place its parent does not take', { kind: 'move', ...WORLD, target: 15 }, 'content'],
  ['content its parent cannot lose', { kind: 'move', from: 16, to: 20, target: 0 }, 'content'],
];

const BROKEN: readonly (readonly [string, unknown])[] = [
  ['a move without a target', { kind: 'move', from: 0, to: 7 }],
  ['a move with a negative target', { kind: 'move', from: 0, to: 7, target: -1 }],
  ['a move with a fractional end', { kind: 'move', from: 0, to: 7.5, target: 14 }],
  ['a move of nothing', { kind: 'move', from: 7, to: 7, target: 0 }],
  ['a move into itself', { kind: 'move', from: 0, to: 14, target: 7 }],
];

describe('move steps', () => {
  it('carries a block between its siblings in both directions and keeps the node itself', () => {
    const start = page();
    const [hello, world] = start.root.content;
    const backwards = applied(start, worldFirst);
    const forwards = applied(start, helloSecond);

    expect(textOf(backwards)).toBe('World|Hello|ab|cd');
    expect(backwards.root.content[0]).toBe(world);
    expect(backwards.root.content[1]).toBe(hello);
    expect(forwards.root).toEqual(backwards.root);
    expect(backwards.size).toBe(start.size);
  });

  it('carries a block into another parent and several blocks at once', () => {
    const start = page();
    const nested = applied(start, worldIntoItem);
    const both = applied(start, { kind: 'move', from: 0, to: 14, target: start.size });

    expect(textOf(nested)).toBe('Hello|ab|World|cd');
    expect(nested.resolve(AFTER_AB - WORLD.to + WORLD.from).parent.type).toBe('item');
    expect(textOf(both)).toBe('ab|cd|Hello|World');
  });

  it('carries a list item with everything inside it', () => {
    const start = page();
    const swapped = applied(start, { kind: 'move', ...FIRST_ITEM, target: 27 });

    expect(textOf(swapped)).toBe('Hello|World|cd|ab');
    expect(swapped.resolve(LIST_START + 1).parent.type).toBe('list');
  });

  it.each(REFUSED)('refuses %s', (_name, step, reason) => {
    expect(applyStep(page(), step)).toEqual({ ok: false, reason });
  });

  it.each([
    ['backwards', worldFirst],
    ['forwards', helloSecond],
    ['into another parent', worldIntoItem],
  ])('is undone by its inverse when it goes %s', (_name, step) => {
    const start = page();
    const inverse = invertStep(step, start);

    expect(inverse.kind).toBe('move');
    expect(applied(applied(start, step), inverse).root).toEqual(start.root);
  });

  it('goes over the wire and refuses a malformed one', () => {
    expect(stepFromJSON(notes, JSON.parse(JSON.stringify(stepToJSON(worldFirst))))).toEqual(
      worldFirst,
    );

    for (const [, value] of BROKEN) {
      expect(stepFromJSON(notes, value)).toBeUndefined();
    }
  });
});

describe('positions around a move', () => {
  it('follow the block that moved and the blocks it passed', () => {
    const map = stepMapOf(worldFirst);

    expect([8, 10, 13].map((pos) => map.map(pos))).toEqual([1, 3, 6]);
    expect([1, 3, 6].map((pos) => map.map(pos))).toEqual([8, 10, 13]);
    expect([15, 20, 28].map((pos) => map.map(pos))).toEqual([15, 20, 28]);
    expect(map.mapResult(10)).toMatchObject({ pos: 3, deleted: false, deletedAcross: false });
  });

  it('stay with the content on their side at the edges of the move', () => {
    const map = stepMapOf(worldFirst);

    expect([map.map(0, -1), map.map(0, 1)]).toEqual([0, 7]);
    expect([map.map(7, -1), map.map(7, 1)]).toEqual([14, 0]);
    expect([map.map(14, -1), map.map(14, 1)]).toEqual([7, 14]);
  });

  it('come back through the inverse map and through a mapping', () => {
    const map = stepMapOf(worldIntoItem);
    const there = createMapping([map]);
    const back = createMapping([map, map.invert()]);

    expect([1, 8, 13, 16, 19, 25].map((pos) => back.map(pos))).toEqual([1, 8, 13, 16, 19, 25]);
    expect(there.map(9)).toBe(map.map(9));
  });
});

describe('steps moved over a move', () => {
  it('follow text typed into the block that moved and into a block it passed', () => {
    expect(over(typing(9), worldFirst)).toMatchObject({ from: 2, to: 2 });
    expect(over(typing(3), worldFirst)).toMatchObject({ from: 10, to: 10 });
    expect(over(typing(18), worldFirst)).toMatchObject({ from: 18, to: 18 });
  });

  it('keep a removal of the moved block, of a passed block and of everything around the move', () => {
    expect(over(removal(7, 14), worldFirst)).toMatchObject({ from: 0, to: 7 });
    expect(over(removal(0, 7), worldFirst)).toMatchObject({ from: 7, to: 14 });
    expect(over(removal(0, 14), worldFirst)).toMatchObject({ from: 0, to: 14 });
    expect(over(removal(9, 12), worldFirst)).toMatchObject({ from: 2, to: 5 });
  });

  it('drop a range the move tore apart instead of removing what was never selected', () => {
    expect(over(removal(3, 10), worldFirst)).toBeUndefined();
    expect(over(removal(10, 18), worldFirst)).toBeUndefined();
    expect(over(removal(16, 24), worldIntoItem)).toBeUndefined();
  });

  it('carry a wrap of the moved block along and drop a wrap whose inside was torn apart', () => {
    expect(over(wrapping(WORLD.from, WORLD.to), worldFirst)).toMatchObject({
      from: 0,
      to: 7,
      gapFrom: 1,
      gapTo: 6,
    });

    expect(over(wrapping(HELLO.from, WORLD.to), worldFirst)).toBeUndefined();
  });

  it('keep the gaps of a mark step with their text and in reading order', () => {
    const marked = over(
      bolding(HELLO.from, WORLD.to, [
        [1, 3],
        [9, 12],
      ]),
      worldFirst,
    );

    expect(marked).toMatchObject({
      from: 0,
      to: 14,
      skip: [
        { from: 2, to: 5 },
        { from: 8, to: 10 },
      ],
    });
  });

  it('put a block inserted beside the moved block next to it', () => {
    expect(over(typing(7), worldFirst)).toMatchObject({ from: 0, to: 0 });
    expect(over(typing(14), worldFirst)).toMatchObject({ from: 14, to: 14 });
  });
});

describe('a move moved over other steps', () => {
  it('grows with text typed into its block and follows a block inserted before it', () => {
    expect(over(worldFirst, typing(9))).toEqual({ kind: 'move', from: 7, to: 15, target: 0 });
    expect(over(worldFirst, typing(3))).toEqual({ kind: 'move', from: 8, to: 15, target: 0 });
  });

  it('vanishes when its block or the place it was going to is gone', () => {
    expect(over(worldFirst, removal(7, 14))).toBeUndefined();
    expect(over(worldIntoItem, removal(14, 28))).toBeUndefined();
  });

  it('carries the block again from where another move left it', () => {
    const start = page();
    const second = over(helloToEnd(start), worldFirst);

    expect(second).toEqual({ kind: 'move', from: 7, to: 14, target: start.size });

    expect(textOf(applied(applied(start, worldFirst), second ?? worldFirst))).toBe(
      'World|ab|cd|Hello',
    );
  });

  it('vanishes when another move already carried its block to the same place', () => {
    expect(over(worldFirst, worldFirst)).toBeUndefined();
  });
});
