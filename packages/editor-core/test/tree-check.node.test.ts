import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { createTreeCheck, type ContentNode, type ElementNode } from '../src';
import { createRandom, fixtureSchema, generateDoc, type Random } from '../src/fixtures';

type Path = readonly number[];

type Edit = (node: ElementNode, random: Random, ids: readonly string[]) => readonly ContentNode[];

const EDITS = 30;

const RUNS = 200;

const KEPT_INVALID = 0.3;

const BOLD = fixtureSchema.mark('bold');

const isLeaf = (node: ElementNode): boolean => fixtureSchema.nodes.get(node.type)?.leaf === true;

const rebuilt = (node: ElementNode, content: readonly ContentNode[]): ElementNode =>
  fixtureSchema.element(node.type, { id: node.id, attrs: node.attrs, content });

const replacedAt = (
  node: ElementNode,
  path: Path,
  edit: (target: ElementNode) => readonly ContentNode[],
): readonly ContentNode[] => {
  const [index, ...rest] = path;
  const child = index === undefined ? undefined : node.content[index];

  if (index === undefined || child?.kind !== 'element') {
    return edit(node);
  }

  const content = node.content.toSpliced(index, 1, ...replacedAt(child, rest, edit));

  return [rebuilt(node, content)];
};

const pathsOf = (node: ElementNode, path: Path = []): readonly Path[] =>
  node.content.reduce<Path[]>(
    (paths, child, index) => {
      if (child.kind === 'element') {
        for (const inner of pathsOf(child, [...path, index])) {
          paths.push(inner);
        }
      }
      return paths;
    },
    [path],
  );

const idsOf = (node: ElementNode): readonly string[] =>
  node.content.reduce<string[]>(
    (ids, child) => {
      if (child.kind === 'element') {
        for (const id of idsOf(child)) {
          ids.push(id);
        }
      }
      return ids;
    },
    [node.id],
  );

const retexted: Edit = (node, random) => [
  rebuilt(
    node,
    node.content.map((child) =>
      child.kind === 'text' && random.chance(0.5)
        ? fixtureSchema.text(`${child.text}${String(random.int(0, 9))}`, child.marks)
        : child,
    ),
  ),
];

const emptied: Edit = (node) => [
  rebuilt(
    node,
    node.content.map((child) =>
      child.kind === 'text' ? fixtureSchema.text('', child.marks) : child,
    ),
  ),
];

const boldened: Edit = (node) => [
  rebuilt(
    node,
    node.content.map((child) =>
      child.kind === 'text' && child.marks.length === 0
        ? fixtureSchema.text(child.text, [BOLD])
        : child,
    ),
  ),
];

const split: Edit = (node) => [
  rebuilt(
    node,
    node.content.flatMap((child) =>
      child.kind === 'text' && child.text.length > 1
        ? [
            fixtureSchema.text(child.text.slice(0, 1), child.marks),
            fixtureSchema.text(child.text.slice(1), child.marks),
          ]
        : [child],
    ),
  ),
];

const renamed: Edit = (node, random, ids) => [
  fixtureSchema.element(node.type, {
    id: random.chance(0.5)
      ? (ids[random.int(0, ids.length - 1)] ?? node.id)
      : `fresh-${String(random.int(0, 1_000_000))}`,
    attrs: node.attrs,
    content: node.content,
  }),
];

const dropped: Edit = (node, random) => {
  const at = random.int(0, Math.max(0, node.content.length - 1));

  return [rebuilt(node, node.content.toSpliced(at, 1))];
};

const added: Edit = (node, random) =>
  isLeaf(node)
    ? [node]
    : [
        rebuilt(
          node,
          node.content.toSpliced(
            random.int(0, node.content.length),
            0,
            fixtureSchema.element('paragraph', {
              id: `new-${String(random.int(0, 1_000_000))}`,
              content: [fixtureSchema.text('new')],
            }),
          ),
        ),
      ];

const swapped: Edit = (node, random) => {
  const one = random.int(0, Math.max(0, node.content.length - 1));
  const other = random.int(0, Math.max(0, node.content.length - 1));
  const first = node.content[one];
  const second = node.content[other];

  return first === undefined || second === undefined
    ? [node]
    : [rebuilt(node, node.content.with(one, second).with(other, first))];
};

const relevelled: Edit = (node, random) => [
  {
    ...node,
    attrs:
      node.type === 'heading'
        ? { ...node.attrs, level: random.int(0, 8) }
        : { ...node.attrs, unknown: random.int(0, 1) },
  },
];

const EDIT_LIST: readonly [Edit, ...Edit[]] = [
  retexted,
  retexted,
  retexted,
  emptied,
  boldened,
  split,
  renamed,
  dropped,
  added,
  added,
  swapped,
  relevelled,
];

const carried = (root: ElementNode, random: Random): ElementNode => {
  const paths = pathsOf(root).filter((path) => path.length > 0);
  const from = paths[random.int(0, paths.length - 1)];

  if (from === undefined) {
    return root;
  }

  let moved: ContentNode | undefined;

  const [left] = replacedAt(root, from.slice(0, -1), (parent) => {
    moved = parent.content[from.at(-1) ?? 0];
    return [rebuilt(parent, parent.content.toSpliced(from.at(-1) ?? 0, 1))];
  });

  if (left?.kind !== 'element' || moved === undefined) {
    return root;
  }

  const holders = pathsOf(left).filter((path) => {
    let node: ContentNode | undefined = left;

    for (const index of path) {
      node = node?.kind === 'element' ? node.content[index] : undefined;
    }
    return node?.kind === 'element' && !isLeaf(node);
  });

  const into = holders[random.int(0, holders.length - 1)] ?? [];
  const block = moved;

  const [next] = replacedAt(left, into, (parent) => [
    rebuilt(parent, parent.content.toSpliced(random.int(0, parent.content.length), 0, block)),
  ]);

  return next?.kind === 'element' ? next : root;
};

const attempted = (root: ElementNode, build: () => ElementNode): ElementNode => {
  try {
    return build();
  } catch (error) {
    if (error instanceof RangeError) {
      return root;
    }
    throw error;
  }
};

const editedRoot = (root: ElementNode, random: Random): ElementNode => {
  if (random.chance(0.15)) {
    return carried(root, random);
  }

  const paths = pathsOf(root);
  const path = paths[random.int(0, paths.length - 1)] ?? [];
  const edit = random.pick(EDIT_LIST);
  const ids = idsOf(root);
  const [next] = replacedAt(root, path, (node) => edit(node, random, ids));

  return next?.kind === 'element' ? next : root;
};

describe('createTreeCheck', () => {
  it('answers as a full check after any chain of edits, valid or not', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2_147_483_647 }),
        fc.integer({ min: 1, max: 12 }),
        (seed, size) => {
          const random = createRandom(seed);
          const check = createTreeCheck(fixtureSchema);
          const roots: ElementNode[] = [generateDoc(fixtureSchema, { blocks: size, seed }).root];

          for (let step = 0; step < EDITS; step += 1) {
            const current = roots.at(-1) ?? roots[0];
            const back = random.chance(0.1) ? roots[random.int(0, roots.length - 1)] : undefined;

            const root =
              back ??
              (current === undefined
                ? undefined
                : attempted(current, () => editedRoot(current, random)));

            if (root === undefined || current === undefined) {
              return;
            }

            const expected = fixtureSchema.check(root);

            expect(check(root)).toEqual(expected);

            if (expected.ok || random.chance(KEPT_INVALID)) {
              roots.push(root);
              continue;
            }
            expect(check(current)).toEqual(fixtureSchema.check(current));
          }
        },
      ),
      { numRuns: RUNS },
    );
  });
});
