import { afterEach, describe, expect, it } from 'vitest';
import {
  deleteChild,
  duplicateChild,
  holdsSlots,
  containerSlot,
  moveChild,
  selectionSlot,
  slotAt,
  textSelection,
  type Command,
  type ContentNode,
  type ElementNode,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const p = (text: string) => node('paragraph', [text]);

const li = (text: string, ...rest: readonly ContentNode[]) => node('list_item', [p(text), ...rest]);

const started = (...blocks: readonly ElementNode[]): EditingHarness => {
  harness = EditingHarness.of(doc(...blocks), textSelection(2));
  return harness;
};

const runs = (editor: EditingHarness, command: Command): boolean =>
  command(editor.state, (tr) => {
    editor.change(() => tr);
  });

const ids = (editor: EditingHarness): string[] =>
  editor.state.doc.root.content.flatMap((block) => (block.kind === 'element' ? [block.id] : []));

const elements = (nodes: readonly ContentNode[]): ElementNode[] =>
  nodes.flatMap((child) => (child.kind === 'element' ? [child] : []));

const idsOf = (root: ElementNode): string[] => [
  root.id,
  ...elements(root.content).flatMap((child) => idsOf(child)),
];

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('moving children', () => {
  it('moves a top-level block with its id and the cursor in one undo step', () => {
    const editor = started(p('a'), node('heading', ['b']), p('c'));
    const root = editor.state.doc.root.id;
    const before = ids(editor);

    expect(runs(editor, moveChild(root, 0, 2))).toBe(true);
    expect(editor.outline).toBe('heading("b") paragraph("c") paragraph("a")');
    expect(ids(editor)).toEqual([before[1], before[2], before[0]]);
    expect(editor.selection).toEqual(textSelection(8));
    expect(selectionSlot(editor.state)).toEqual({ parent: root, index: 2 });

    expect(editor.press('Mod-Shift-ArrowUp')).toBe(true);
    expect(editor.outline).toBe('heading("b") paragraph("a") paragraph("c")');
    expect(editor.press('Mod-z')).toBe(true);
    expect(editor.outline).toBe('heading("b") paragraph("c") paragraph("a")');
    expect(moveChild(root, 0, 0)(editor.state)).toBe(false);
    expect(moveChild(root, 0, 5)(editor.state)).toBe(false);
    expect(moveChild('missing', 0, 1)(editor.state)).toBe(false);
  });

  it('finds list items as the deepest movable children and reorders them inside their list', () => {
    const editor = started(
      node('bullet_list', [li('one'), li('two', node('bullet_list', [li('deep')])), li('three')]),
    );

    const list = editor.state.doc.root.content[0];
    const listId = list?.kind === 'element' ? list.id : '';

    expect(slotAt(editor.state.doc, 3)).toEqual({ parent: listId, index: 0 });

    editor.placeIn('deep', 1);
    const deep = selectionSlot(editor.state);

    expect(deep?.index).toBe(0);
    expect(deep?.parent).not.toBe(listId);

    editor.placeIn('one', 1);

    expect(editor.press('Mod-Shift-ArrowDown')).toBe(true);

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("two") bullet_list(list_item(paragraph("deep")))) list_item(paragraph("one")) list_item(paragraph("three")))',
    );
  });

  it('holds movable children only in the root and in lists', () => {
    const { doc: current } = started(node('bullet_list', [li('one')])).state;
    const [list] = elements(current.root.content);
    const [item] = elements(list?.content ?? []);

    expect(
      [current.root, list, item].map((each) => each !== undefined && holdsSlots(current, each)),
    ).toEqual([true, true, false]);
  });

  it('finds the nearest movable container around a slot', () => {
    const editor = started(node('bullet_list', [li('one', node('bullet_list', [li('deep')]))]));
    const { doc: current } = editor.state;
    const nested = idsOf(current.root);

    expect(containerSlot(current, { parent: nested[1] ?? '', index: 0 })).toEqual({
      parent: current.root.id,
      index: 0,
    });

    expect(containerSlot(current, { parent: nested[4] ?? '', index: 0 })).toEqual({
      parent: nested[1],
      index: 0,
    });

    expect(containerSlot(current, { parent: current.root.id, index: 0 })).toBeUndefined();
  });

  it('duplicates under fresh ids and deletes up to the enclosing list and down to one empty block', () => {
    const editor = started(p('a'), node('bullet_list', [li('x')]), p('c'));
    const root = editor.state.doc.root.id;

    expect(runs(editor, duplicateChild({ parent: root, index: 0 }))).toBe(true);

    expect(editor.outline).toBe(
      'paragraph("a") paragraph("a") bullet_list(list_item(paragraph("x"))) paragraph("c")',
    );

    expect(new Set(ids(editor)).size).toBe(4);
    expect(duplicateChild({ parent: root, index: 9 })(editor.state)).toBe(false);

    editor.placeIn('x', 0);
    const item = selectionSlot(editor.state);

    expect(item !== undefined && runs(editor, deleteChild(item))).toBe(true);
    expect(editor.outline).toBe('paragraph("a") paragraph("a") paragraph("c")');

    for (const index of [2, 1, 0]) {
      expect(runs(editor, deleteChild({ parent: root, index }))).toBe(true);
    }
    expect(editor.outline).toBe('paragraph()');
    expect(editor.selection).toEqual(textSelection(1));
    expect(deleteChild({ parent: root, index: 4 })(editor.state)).toBe(false);
  });
});
