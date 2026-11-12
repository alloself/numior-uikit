import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  createTransform,
  invertStep,
  mapSelection,
  textSelection,
  validSelection,
  type ContentMatch,
  type Doc,
  type Transform,
} from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { childOffsets, nodeSize, spliceContent, typeOf } from '../src/model/node';
import type { ElementNode } from '../src/model/node.types';
import { statesOf } from '../src/schema/content-match';

type Change = (transform: Transform) => void;

interface TextSpot {
  readonly pos: number;
  readonly end: number;
}

const EMPTY = { content: [], openStart: 0, openEnd: 0 } as const;

const textSpots = (doc: Doc): TextSpot[] => {
  const spots: TextSpot[] = [];

  doc.nodesBetween(0, doc.size, (node, pos) => {
    if (node.kind === 'element' && doc.schema.nodes.get(node.type)?.inlineContent === true) {
      for (let offset = pos + 1; offset <= pos + node.size - 1; offset += 1) {
        spots.push({ pos: offset, end: pos + node.size - 1 });
      }
    }
    return true;
  });

  return spots;
};

const boundaries = (doc: Doc): number[] => {
  const found: number[] = [];

  doc.nodesBetween(0, doc.size, (node, pos) => {
    const before = doc.resolve(pos).nodeBefore;

    if (node.kind === 'element' && before?.kind === 'element' && !before.leaf && !node.leaf) {
      found.push(pos);
    }
    return true;
  });

  return found;
};

const pick = <T>(items: readonly T[], at: number): T | undefined =>
  items[at % Math.max(1, items.length)];

const withSpot =
  (at: number, act: (transform: Transform, spot: TextSpot) => void): Change =>
  (transform) => {
    const spot = pick(textSpots(transform.doc), at);

    if (spot === undefined) {
      return;
    }

    act(transform, spot);
  };

const typing = (at: number, value: string): Change =>
  withSpot(at, (transform, spot) => {
    const slice = { content: [transform.doc.schema.text(value)], openStart: 0, openEnd: 0 };

    transform.maybeStep({ kind: 'replace', from: spot.pos, to: spot.pos, slice });
  });

const deleting = (at: number, length: number): Change =>
  withSpot(at, (transform, spot) => {
    transform.maybeStep({
      kind: 'replace',
      from: spot.pos,
      to: Math.min(spot.end, spot.pos + length),
      slice: EMPTY,
    });
  });

const marking = (at: number, length: number, mark: 'bold' | 'italic'): Change =>
  withSpot(at, (transform, spot) => {
    transform.addMark(
      spot.pos,
      Math.min(spot.end, spot.pos + length),
      transform.doc.schema.mark(mark),
    );
  });

const unmarking = (at: number, length: number): Change =>
  withSpot(at, (transform, spot) => {
    transform.removeMark(spot.pos, Math.min(spot.end, spot.pos + length));
  });

const splitting = (at: number): Change =>
  withSpot(at, (transform, spot) => {
    if (transform.doc.resolve(spot.pos).parent.type === 'code_block') {
      return;
    }

    transform.split(spot.pos);
  });

const joining =
  (at: number): Change =>
  (transform) => {
    const pos = pick(boundaries(transform.doc), at);

    if (pos === undefined) {
      return;
    }

    transform.maybeStep({ kind: 'replace', from: pos - 1, to: pos + 1, slice: EMPTY });
  };

const topTextblocks = (doc: Doc): { readonly pos: number; readonly type: string }[] => {
  const found: { pos: number; type: string }[] = [];

  doc.nodesBetween(0, doc.size, (node, pos, parent) => {
    if (
      node.kind === 'element' &&
      parent === doc.root &&
      ['paragraph', 'heading'].includes(node.type)
    ) {
      found.push({ pos, type: node.type });
    }
    return false;
  });

  return found;
};

const retyping =
  (at: number, count: number): Change =>
  (transform) => {
    const blocks = topTextblocks(transform.doc);
    const chosen = blocks.filter((_, index) => (index + at) % Math.max(1, count) === 0);

    transform.setNodesMarkup(
      chosen.map(({ pos, type }) =>
        type === 'heading'
          ? { pos, type: 'paragraph' }
          : { pos, type: 'heading', attrs: { level: 2 } },
      ),
    );
  };

const change: fc.Arbitrary<Change> = fc.oneof(
  fc
    .tuple(fc.nat(), fc.string({ minLength: 1, maxLength: 4 }))
    .map(([at, value]) => typing(at, value)),
  fc.tuple(fc.nat(), fc.integer({ min: 1, max: 6 })).map(([at, length]) => deleting(at, length)),
  fc
    .tuple(
      fc.nat(),
      fc.integer({ min: 1, max: 8 }),
      fc.constantFrom<'bold' | 'italic'>('bold', 'italic'),
    )
    .map(([at, length, mark]) => marking(at, length, mark)),
  fc.tuple(fc.nat(), fc.integer({ min: 1, max: 8 })).map(([at, length]) => unmarking(at, length)),
  fc.nat().map(splitting),
  fc.nat().map(joining),
  fc.tuple(fc.nat(), fc.integer({ min: 1, max: 3 })).map(([at, count]) => retyping(at, count)),
);

const scenario = fc.record({
  blocks: fc.integer({ min: 1, max: 5 }),
  seed: fc.integer({ min: 1, max: 1_000_000 }),
  changes: fc.array(change, { minLength: 1, maxLength: 8 }),
});

const wideScenario = fc.record({
  blocks: fc.integer({ min: 64, max: 90 }),
  seed: fc.integer({ min: 1, max: 1_000_000 }),
  changes: fc.array(change, { minLength: 1, maxLength: 8 }),
});

const replay = (blocks: number, seed: number, changes: readonly Change[]): Transform => {
  const transform = createTransform(generateDoc(fixtureSchema, { blocks, seed }));

  for (const apply of changes) {
    apply(transform);
  }
  return transform;
};

const undone = (transform: Transform): Doc =>
  transform.steps.reduceRight((current, step, index) => {
    const before = transform.docs[index];

    if (before === undefined) {
      return current;
    }
    const result = createTransform(current).maybeStep(invertStep(step, before));

    if (!result.ok) {
      throw new Error(`inverse of ${step.kind} failed: ${result.reason}`);
    }
    return result.doc;
  }, transform.doc);

const sameStates = (
  left: readonly (ContentMatch | undefined)[],
  right: readonly (ContentMatch | undefined)[],
): boolean => left.length === right.length && left.every((state, index) => state === right[index]);

const freshOffsets = (node: ElementNode): number[] =>
  node.content.reduce<{ offsets: number[]; next: number }>(
    (state, child) => {
      state.offsets.push(state.next);
      state.next += nodeSize(child);
      return state;
    },
    { offsets: [], next: 0 },
  ).offsets;

const staleOffsets = (doc: Doc): number => {
  let stale = 0;

  doc.nodesBetween(0, doc.size, (node) => {
    if (node.kind === 'element') {
      stale += childOffsets(node).join(',') === freshOffsets(node).join(',') ? 0 : 1;
    }
    return true;
  });

  return stale + (childOffsets(doc.root).join(',') === freshOffsets(doc.root).join(',') ? 0 : 1);
};

const freshStates = (start: ContentMatch, node: ElementNode): (ContentMatch | undefined)[] =>
  node.content.reduce<(ContentMatch | undefined)[]>(
    (states, child) => {
      states.push(states.at(-1)?.matchType(typeOf(child)));
      return states;
    },
    [start],
  );

const staleStates = (doc: Doc): number => {
  let stale = 0;

  doc.nodesBetween(0, doc.size, (node) => {
    const start = node.kind === 'element' ? fixtureSchema.nodes.get(node.type)?.content : undefined;

    if (node.kind === 'element' && start !== undefined) {
      stale += sameStates(statesOf(start, node), freshStates(start, node)) ? 0 : 1;
    }
    return true;
  });

  const top = fixtureSchema.nodes.get(doc.root.type)?.content;

  return top === undefined || sameStates(statesOf(top, doc.root), freshStates(top, doc.root))
    ? stale
    : stale + 1;
};

describe('step properties', () => {
  it('derives child offsets when children are spliced into empty and filled nodes', () => {
    const { root } = generateDoc(fixtureSchema, { blocks: 70, seed: 3 });
    const blocks = root.content;
    const empty: ElementNode = { ...root, content: [], size: 2 };

    const spliced = [
      [empty, 0, 0, blocks.slice(0, 2)],
      [root, 0, 0, blocks.slice(1, 2)],
      [root, 2, 3, blocks.slice(0, 3)],
      [root, 40, 45, blocks.slice(0, 1)],
      [root, blocks.length, blocks.length, blocks.slice(0, 1)],
    ] as const;

    spliced.forEach(([node, first, last, replacement]) => {
      childOffsets(node);

      const next = spliceContent(node, first, last, replacement);

      expect(childOffsets(next)).toEqual(freshOffsets(next));
    });
  });

  it('keeps the child offsets it derives for new nodes equal to fresh sums', () => {
    fc.assert(
      fc.property(wideScenario, ({ blocks, seed, changes }) => {
        const transform = replay(blocks, seed, changes);

        expect([...transform.docs, transform.doc].map(staleOffsets)).toEqual(
          [...transform.docs, transform.doc].map(() => 0),
        );
      }),
      { numRuns: 120 },
    );
  });

  it('keeps the content states it derives for new nodes equal to a fresh walk', () => {
    fc.assert(
      fc.property(wideScenario, ({ blocks, seed, changes }) => {
        const transform = replay(blocks, seed, changes);

        expect([...transform.docs, transform.doc].map(staleStates)).toEqual(
          [...transform.docs, transform.doc].map(() => 0),
        );
      }),
      { numRuns: 120 },
    );
  });

  it('keeps every document valid and restores the start with the inverse steps', () => {
    const kinds = new Set<string>();
    let applied = 0;

    fc.assert(
      fc.property(scenario, ({ blocks, seed, changes }) => {
        const transform = replay(blocks, seed, changes);

        applied += transform.steps.length;
        transform.steps.forEach((step) => kinds.add(step.kind));

        expect(
          [...transform.docs, transform.doc].every((doc) => fixtureSchema.check(doc.root).ok),
        ).toBe(true);

        expect(undone(transform).root).toEqual(transform.before.root);
      }),
      { numRuns: 150 },
    );

    expect(applied).toBeGreaterThan(300);
    expect([...kinds].toSorted()).toEqual(['addMark', 'markup', 'removeMark', 'replace']);
  });

  it('maps positions monotonically and brings back the ones nothing deleted', () => {
    fc.assert(
      fc.property(scenario, fc.nat(), fc.nat(), ({ blocks, seed, changes }, left, right) => {
        const transform = replay(blocks, seed, changes);
        const size = transform.before.size;
        const low = Math.min(left, right) % (size + 1);
        const high = Math.max(low, Math.max(left, right) % (size + 1));
        const mapping = transform.mapping;

        expect(mapping.map(low)).toBeLessThanOrEqual(mapping.map(high));

        const result = mapping.mapResult(low);
        const kept = !result.deletedBefore && !result.deletedAfter;

        expect(kept ? mapping.invert().map(result.pos) : low).toBe(low);
      }),
      { numRuns: 150 },
    );
  });

  it('keeps text selections valid when they are mapped through random edits', () => {
    fc.assert(
      fc.property(scenario, fc.nat(), fc.nat(), ({ blocks, seed, changes }, left, right) => {
        const transform = replay(blocks, seed, changes);
        const spots = textSpots(transform.before);
        const anchor = pick(spots, left)?.pos ?? 1;
        const head = pick(spots, right)?.pos ?? 1;

        const mapped = mapSelection(
          textSelection(anchor, head),
          transform.mapping,
          transform.before,
          transform.doc,
        );

        expect(validSelection(transform.doc, mapped)).toBe(mapped);
      }),
      { numRuns: 150 },
    );
  });
});
