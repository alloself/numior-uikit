import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createTransform, invertStep, type Doc, type Transform } from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';

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

    if (spot !== undefined) {
      act(transform, spot);
    }
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
    if (transform.doc.resolve(spot.pos).parent.type !== 'code_block') {
      transform.split(spot.pos);
    }
  });

const joining =
  (at: number): Change =>
  (transform) => {
    const pos = pick(boundaries(transform.doc), at);

    if (pos !== undefined) {
      transform.maybeStep({ kind: 'replace', from: pos - 1, to: pos + 1, slice: EMPTY });
    }
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
);

const scenario = fc.record({
  blocks: fc.integer({ min: 1, max: 5 }),
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

describe('step properties', () => {
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
    expect([...kinds].toSorted()).toEqual(['addMark', 'removeMark', 'replace']);
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
});
