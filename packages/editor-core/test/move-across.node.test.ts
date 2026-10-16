import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  childNode,
  createState,
  createTransform,
  invertStep,
  isSlot,
  moveBlock,
  placeBeside,
  toJSON,
  type Doc,
  type Step,
  textSelection,
  type BlockTarget,
  type ChildSlot,
  type ContentNode,
  type ElementNode,
} from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const p = (text: string) => node('paragraph', [text]);

const li = (text: string) => node('list_item', [p(text)]);

const started = (...blocks: readonly ElementNode[]): EditingHarness => {
  harness = EditingHarness.of(doc(...blocks), textSelection(2));
  return harness;
};

afterEach(() => {
  harness?.release();
  harness = undefined;
});

const elements = (nodes: readonly ContentNode[]): ElementNode[] =>
  nodes.flatMap((child) => (child.kind === 'element' ? [child] : []));

const block = (editor: EditingHarness, ...path: readonly number[]): ElementNode => {
  let current = editor.state.doc.root;

  for (const index of path) {
    const next = elements(current.content)[index];

    if (next === undefined) {
      throw new Error(`No block at ${path.join('.')}`);
    }
    current = next;
  }
  return current;
};

const moves = (editor: EditingHarness, from: ChildSlot, to: BlockTarget): boolean =>
  moveBlock(from, to)(editor.state, (tr) => {
    editor.change(() => tr);
  });

const slot = (editor: EditingHarness, index: number, ...path: readonly number[]): ChildSlot => ({
  parent: block(editor, ...path).id,
  index,
});

describe('moving blocks across containers', () => {
  it('drops a paragraph into a callout after its first line and undoes it in one step', () => {
    const editor = started(p('a'), node('callout', [p('note')]), p('c'));
    const before = editor.outline;

    expect(moves(editor, slot(editor, 0), slot(editor, 1, 1))).toBe(true);
    expect(editor.outline).toBe('callout(paragraph("note") paragraph("a")) paragraph("c")');
    expect(moves(editor, slot(editor, 0, 0), slot(editor, 0, 0))).toBe(false);

    editor.press('Mod-z');

    expect(editor.outline).toBe(before);
  });

  it('turns paragraphs and headings into items between list items and keeps their ids', () => {
    const editor = started(
      node('heading', ['Title'], { level: 2 }),
      node('bullet_list', [li('one'), li('two')]),
    );

    const heading = block(editor, 0).id;

    expect(moves(editor, slot(editor, 0), slot(editor, 1, 1))).toBe(true);

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("Title")) list_item(paragraph("two")))',
    );

    expect(block(editor, 0, 1, 0).id).toBe(heading);
  });

  it('lifts an item out as a list of its kind, joins a neighbouring list and drops the emptied one', () => {
    const editor = started(
      node('bullet_list', [li('one')]),
      p('middle'),
      node('bullet_list', [li('two'), li('three')]),
    );

    expect(moves(editor, slot(editor, 0, 0), slot(editor, 2))).toBe(true);

    expect(editor.outline).toBe(
      'paragraph("middle") bullet_list(list_item(paragraph("one")) list_item(paragraph("two")) list_item(paragraph("three")))',
    );
  });

  it('retypes items between list kinds and refuses drops into the moved block itself', () => {
    const editor = started(
      node('todo_list', [node('todo_item', [p('task')], { checked: true })]),
      node('bullet_list', [li('one')]),
      node('callout', [p('head'), node('bullet_list', [li('inner')])]),
    );

    expect(moves(editor, slot(editor, 0, 0), slot(editor, 1, 1))).toBe(true);

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("task"))) callout(paragraph("head") bullet_list(list_item(paragraph("inner"))))',
    );

    expect(moves(editor, slot(editor, 1), slot(editor, 1, 1, 1))).toBe(false);
  });

  it('removes an emptied column and unwraps the last one left', () => {
    const editor = started(
      node('columns', [node('column', [p('left')]), node('column', [p('right')])]),
      p('after'),
    );

    expect(moves(editor, slot(editor, 0, 0, 0), slot(editor, 2))).toBe(true);
    expect(editor.outline).toBe('paragraph("right") paragraph("after") paragraph("left")');
  });

  it('keeps the caret in the moved text', () => {
    const editor = started(p('a'), node('callout', [p('note')]), p('carried'));

    editor.placeIn('carried', 3);
    expect(moves(editor, slot(editor, 2), slot(editor, 1, 1))).toBe(true);

    const moved = editor.state.doc.positionOf(block(editor, 1, 1).id) ?? 0;

    expect(editor.selection).toEqual(textSelection(moved + 4));
  });
});

const containers = (sample: Doc): ElementNode[] => {
  const found: ElementNode[] = [sample.root];

  sample.nodesBetween(0, sample.size, (child) => {
    if (
      child.kind === 'element' &&
      child.content.some((_, index) => isSlot(sample, child, index))
    ) {
      found.push(child);
    }
    return true;
  });

  return found;
};

const slotsOf = (sample: Doc): ChildSlot[] =>
  containers(sample).flatMap((parent) =>
    parent.content.flatMap((_, index) =>
      isSlot(sample, parent, index) ? [{ parent: parent.id, index }] : [],
    ),
  );

const targetsOf = (sample: Doc): BlockTarget[] =>
  containers(sample).flatMap((parent) =>
    Array.from({ length: parent.content.length + 1 }, (_, index) => index).flatMap((index) =>
      isSlot(sample, parent, index) ? [{ parent: parent.id, index }] : [],
    ),
  );

const textOf = (sample: Doc): string =>
  sample.textBetween(0, sample.size, '').split('').toSorted().join('');

const undone = (start: Doc, steps: readonly Step[], docs: readonly Doc[]): Doc =>
  steps.toReversed().reduce((current, step, index) => {
    const before = docs[docs.length - 1 - index] ?? start;
    const result = createTransform(current).maybeStep(invertStep(step, before));

    if (!result.ok) {
      throw new Error(`inverse of ${step.kind} failed: ${result.reason}`);
    }
    return result.doc;
  }, start);

const COLUMNS = { columns: 'columns', column: 'column', most: 3 } as const;

const beside = (editor: EditingHarness, from: ChildSlot, id: string, side: 'start' | 'end') =>
  placeBeside(
    from,
    id,
    side,
    COLUMNS,
  )(editor.state, (tr) => {
    editor.change(() => tr);
  });

describe('placing blocks beside others', () => {
  it('wraps two blocks into columns and adds columns next to a block inside one', () => {
    const editor = started(p('a'), p('b'), p('c'), p('d'));

    expect(beside(editor, slot(editor, 0), block(editor, 1).id, 'end')).toBe(true);

    expect(editor.outline).toBe(
      'columns(column(paragraph("b")) column(paragraph("a"))) paragraph("c") paragraph("d")',
    );

    expect(beside(editor, slot(editor, 1), block(editor, 0, 1, 0).id, 'start')).toBe(true);

    expect(editor.outline).toBe(
      'columns(column(paragraph("b")) column(paragraph("c")) column(paragraph("a"))) paragraph("d")',
    );

    expect(beside(editor, slot(editor, 1), block(editor, 0, 0, 0).id, 'end')).toBe(false);
    expect(beside(editor, slot(editor, 0, 0, 0), block(editor, 0, 0, 0).id, 'end')).toBe(false);

    editor.press('Mod-z');

    expect(editor.outline).toBe(
      'columns(column(paragraph("b")) column(paragraph("a"))) paragraph("c") paragraph("d")',
    );
  });

  it('turns a list item dropped beside a block into a list of its kind', () => {
    const editor = started(p('a'), node('bullet_list', [li('one'), li('two')]));

    expect(beside(editor, slot(editor, 0, 1), block(editor, 0).id, 'start')).toBe(true);

    expect(editor.outline).toBe(
      'columns(column(bullet_list(list_item(paragraph("one")))) column(paragraph("a"))) bullet_list(list_item(paragraph("two")))',
    );
  });
});

describe('moving blocks across containers, generated', () => {
  it('keeps every document valid, loses no text and inverts in one go', () => {
    let moved = 0;

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), fc.nat(), fc.nat(), (seed, pick, drop) => {
        const sample = generateDoc(fixtureSchema, { blocks: 12, seed });
        const slots = slotsOf(sample);
        const targets = targetsOf(sample);
        const from = slots[pick % slots.length];
        const to = targets[drop % targets.length];
        const state = createState({ doc: sample });

        if (from === undefined || to === undefined) {
          return;
        }

        moveBlock(from, to)(state, (tr) => {
          moved += 1;
          expect(fixtureSchema.check(tr.doc.root).ok).toBe(true);
          expect(textOf(tr.doc)).toBe(textOf(sample));
          expect(toJSON(undone(tr.doc, tr.steps, tr.docs))).toEqual(toJSON(sample));
        });
      }),
      { numRuns: 300, seed: 7 },
    );

    expect(moved).toBeGreaterThan(100);
  });

  it('keeps documents valid when blocks are placed beside others', () => {
    let placed = 0;

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.nat(),
        fc.nat(),
        fc.boolean(),
        (seed, pick, near, start) => {
          const sample = generateDoc(fixtureSchema, { blocks: 12, seed });
          const slots = slotsOf(sample);
          const from = slots[pick % slots.length];
          const target = slots[near % slots.length];
          const neighbour = target === undefined ? undefined : childNode(sample, target);

          if (from === undefined || neighbour === undefined) {
            return;
          }

          placeBeside(
            from,
            neighbour.id,
            start ? 'start' : 'end',
            COLUMNS,
          )(createState({ doc: sample }), (tr) => {
            placed += 1;
            expect(fixtureSchema.check(tr.doc.root).ok).toBe(true);
            expect(textOf(tr.doc)).toBe(textOf(sample));
            expect(toJSON(undone(tr.doc, tr.steps, tr.docs))).toEqual(toJSON(sample));
          });
        },
      ),
      { numRuns: 300, seed: 11 },
    );

    expect(placed).toBeGreaterThan(50);
  });
});
