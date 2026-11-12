import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { createDoc, createTransform, type Doc, type Transform } from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { childOffsets } from '../src/model/node';
import type { ElementNode, NodeId } from '../src/model/node.types';

type Change = (transform: Transform) => void;

interface Block {
  readonly pos: number;
  readonly end: number;
  readonly node: ElementNode;
}

const EMPTY = { content: [], openStart: 0, openEnd: 0 } as const;

const blocksOf = (doc: Doc): Block[] => {
  const offsets = childOffsets(doc.root);

  return doc.root.content.reduce<Block[]>((blocks, node, index) => {
    if (node.kind !== 'element') {
      return blocks;
    }

    const pos = offsets[index] ?? 0;

    blocks.push({ pos, end: pos + node.size, node });
    return blocks;
  }, []);
};

const textual = (node: ElementNode): boolean => node.type === 'paragraph';

const pick = <T>(items: readonly T[], at: number): T | undefined =>
  items[at % Math.max(1, items.length)];

const inserting =
  (at: number): Change =>
  (transform) => {
    const block = pick(blocksOf(transform.doc), at);
    const paragraph = fixtureSchema.element('paragraph', { id: transform.newId(), content: [] });

    transform.insert(at % 2 === 0 ? (block?.pos ?? 0) : (block?.end ?? 0), [paragraph]);
  };

const removing =
  (at: number, count: number): Change =>
  (transform) => {
    const blocks = blocksOf(transform.doc);
    const first = pick(blocks, at);

    const last =
      blocks[
        Math.min(blocks.length - 2, (first === undefined ? 0 : blocks.indexOf(first)) + count - 1)
      ];

    if (first === undefined || last === undefined || last.end <= first.pos) {
      return;
    }

    transform.maybeStep({ kind: 'replace', from: first.pos, to: last.end, slice: EMPTY });
  };

const carrying =
  (at: number, to: number): Change =>
  (transform) => {
    const blocks = blocksOf(transform.doc);
    const block = pick(blocks, at);

    if (block === undefined) {
      return;
    }

    transform.maybeStep({ kind: 'replace', from: block.pos, to: block.end, slice: EMPTY });

    const target = pick(blocksOf(transform.doc), to);
    const slice = { content: [block.node], openStart: 0, openEnd: 0 };

    transform.maybeStep({ kind: 'replace', from: target?.end ?? 0, to: target?.end ?? 0, slice });
  };

const moving =
  (at: number, to: number): Change =>
  (transform) => {
    const blocks = blocksOf(transform.doc);
    const block = pick(blocks, at);
    const target = pick(blocks, to);

    if (block === undefined || target === undefined || target === block) {
      return;
    }

    transform.maybeStep({
      kind: 'move',
      from: block.pos,
      to: block.end,
      target: target.pos < block.pos ? target.pos : target.end,
    });
  };

const wrapping =
  (at: number): Change =>
  (transform) => {
    const block = pick(blocksOf(transform.doc), at);

    if (block === undefined) {
      return;
    }

    const quote = fixtureSchema.element('blockquote', { id: transform.newId(), content: [] });

    transform.maybeStep({
      kind: 'replaceAround',
      from: block.pos,
      to: block.end,
      gapFrom: block.pos,
      gapTo: block.end,
      slice: { content: [quote], openStart: 0, openEnd: 0 },
      insert: 1,
    });
  };

const lifting =
  (at: number): Change =>
  (transform) => {
    const quotes = blocksOf(transform.doc).filter(
      ({ node }) => node.type === 'blockquote' && node.content.length === 1,
    );

    const quote = pick(quotes, at);

    if (quote === undefined) {
      return;
    }

    transform.maybeStep({
      kind: 'replaceAround',
      from: quote.pos,
      to: quote.end,
      gapFrom: quote.pos + 1,
      gapTo: quote.end - 1,
      slice: EMPTY,
      insert: 0,
    });
  };

const splitting =
  (at: number): Change =>
  (transform) => {
    const block = pick(
      blocksOf(transform.doc).filter(({ node }) => node.type === 'paragraph' && node.size > 3),
      at,
    );

    if (block === undefined) {
      return;
    }

    transform.split(block.pos + 2);
  };

const joining =
  (at: number): Change =>
  (transform) => {
    const blocks = blocksOf(transform.doc);
    const block = pick(blocks, at);
    const next = blocks[(block === undefined ? 0 : blocks.indexOf(block)) + 1];

    if (block === undefined || next === undefined || !textual(block.node) || !textual(next.node)) {
      return;
    }

    transform.maybeStep({ kind: 'replace', from: block.end - 1, to: block.end + 1, slice: EMPTY });
  };

const retyping =
  (at: number): Change =>
  (transform) => {
    const block = pick(
      blocksOf(transform.doc).filter(({ node }) => node.type === 'paragraph'),
      at,
    );

    if (block === undefined) {
      return;
    }

    transform.setNodesMarkup([{ pos: block.pos, type: 'heading', attrs: { level: 2 } }]);
  };

const change: fc.Arbitrary<Change> = fc.oneof(
  fc.nat().map(inserting),
  fc.tuple(fc.nat(), fc.integer({ min: 1, max: 3 })).map(([at, count]) => removing(at, count)),
  fc.tuple(fc.nat(), fc.nat()).map(([at, to]) => carrying(at, to)),
  fc.tuple(fc.nat(), fc.nat()).map(([at, to]) => moving(at, to)),
  fc.nat().map(wrapping),
  fc.nat().map(lifting),
  fc.nat().map(splitting),
  fc.nat().map(joining),
  fc.nat().map(retyping),
);

const scenario = fc.record({
  blocks: fc.integer({ min: 2, max: 12 }),
  seed: fc.integer({ min: 1, max: 1_000_000 }),
  changes: fc.array(change, { minLength: 1, maxLength: 90 }),
  backwards: fc.boolean(),
});

const idsOf = (doc: Doc): NodeId[] => {
  const ids: NodeId[] = [];

  doc.nodesBetween(0, doc.size, (node) => {
    if (node.kind === 'element') {
      ids.push(node.id);
    }
    return true;
  });

  return ids;
};

const lookups = (doc: Doc, ids: readonly NodeId[]) =>
  ids.map((id) => ({ id, pos: doc.positionOf(id), node: doc.byId(id) }));

describe('finding nodes by id', () => {
  it('finds each node of every document in a transform where a fresh index finds it', () => {
    fc.assert(
      fc.property(scenario, ({ blocks, seed, changes, backwards }) => {
        const transform = createTransform(generateDoc(fixtureSchema, { blocks, seed }));

        for (const apply of changes) {
          apply(transform);
        }

        const docs = [...transform.docs, transform.doc];
        const ids = [...new Set(docs.flatMap(idsOf)), 'missing'];
        const order = backwards ? docs.toReversed() : docs;

        const found = order.map((doc) => lookups(doc, ids));
        const fresh = order.map((doc) => lookups(createDoc(doc.schema, doc.root), ids));

        expect(found).toEqual(fresh);
      }),
      { numRuns: 300 },
    );
  });

  it('finds blocks by id between the steps of a long transform within the budget of an action', () => {
    const start = generateDoc(fixtureSchema, { blocks: 10_000, seed: 5 });
    const ids = blocksOf(start).map(({ node }) => node.id);

    start.positionOf(ids[0] ?? '');

    const fastest = Math.min(
      ...Array.from({ length: 3 }, () => {
        const transform = createTransform(start);
        const started = performance.now();

        ids.slice(0, 20).forEach((first, index) => {
          const id = ids[(index * 37) % ids.length] ?? first;

          const paragraph = (): ElementNode =>
            fixtureSchema.element('paragraph', { id: transform.newId(), content: [] });

          transform.insert(transform.doc.positionOf(id) ?? 0, [paragraph()]);
          transform.insert(transform.doc.positionOf(id) ?? 0, [paragraph()]);
        });

        return performance.now() - started;
      }),
    );

    expect(fastest).toBeLessThan(100);
  });

  it('finds a far block after each keystroke in a large document within the budget of an action', () => {
    const start = generateDoc(fixtureSchema, { blocks: 10_000, seed: 5 });
    const blocks = blocksOf(start);
    const far = blocks.at(-1)?.node.id ?? '';
    const typed = blocks.find(({ node }) => node.type === 'paragraph');
    const at = (typed?.pos ?? 0) + 1;

    start.positionOf(far);

    const fastest = Math.min(
      ...Array.from({ length: 3 }, () => {
        const started = performance.now();
        let doc = start;

        for (let key = 0; key < 100; key += 1) {
          doc = createTransform(doc).insertText('a', at).doc;
          doc.positionOf(far);
        }
        return performance.now() - started;
      }),
    );

    expect(fastest).toBeLessThan(100);
  });
});
