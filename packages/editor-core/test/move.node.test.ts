import { afterEach, describe, expect, it } from 'vitest';
import {
  blockIndex,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  textSelection,
  type Command,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const three = (): EditingHarness => {
  harness = EditingHarness.of(
    doc(node('paragraph', ['a']), node('heading', ['b']), node('paragraph', ['c'])),
    textSelection(2),
  );

  return harness;
};

const runs = (editor: EditingHarness, command: Command): boolean =>
  command(editor.state, (tr) => {
    editor.change(() => tr);
  });

const ids = (editor: EditingHarness): string[] =>
  editor.state.doc.root.content.flatMap((block) => (block.kind === 'element' ? [block.id] : []));

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('block moves', () => {
  it('moves a block with its id and the cursor in one undo step', () => {
    const editor = three();
    const before = ids(editor);

    expect(runs(editor, moveBlock(0, 2))).toBe(true);
    expect(editor.outline).toBe('heading("b") paragraph("c") paragraph("a")');
    expect(ids(editor)).toEqual([before[1], before[2], before[0]]);
    expect(editor.selection).toEqual(textSelection(8));
    expect(blockIndex(editor.state)).toBe(2);

    expect(editor.press('Mod-Shift-ArrowUp')).toBe(true);
    expect(editor.outline).toBe('heading("b") paragraph("a") paragraph("c")');
    expect(editor.press('Mod-z')).toBe(true);
    expect(editor.outline).toBe('heading("b") paragraph("c") paragraph("a")');
    expect(moveBlock(0, 0)(editor.state)).toBe(false);
    expect(moveBlock(0, 5)(editor.state)).toBe(false);
  });

  it('duplicates a block under fresh ids and deletes blocks down to one empty block', () => {
    const editor = three();

    expect(runs(editor, duplicateBlock(1))).toBe(true);
    expect(editor.outline).toBe('paragraph("a") heading("b") heading("b") paragraph("c")');
    expect(new Set(ids(editor)).size).toBe(4);
    expect(duplicateBlock(9)(editor.state)).toBe(false);

    for (const index of [3, 2, 1]) {
      expect(runs(editor, deleteBlock(index))).toBe(true);
    }
    expect(runs(editor, deleteBlock(0))).toBe(true);
    expect(editor.outline).toBe('paragraph()');
    expect(editor.selection).toEqual(textSelection(1));
    expect(deleteBlock(4)(editor.state)).toBe(false);
  });
});
