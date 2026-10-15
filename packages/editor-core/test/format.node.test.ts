import { afterEach, describe, expect, it } from 'vitest';
import {
  activeBlock,
  activeMarks,
  ancestorTypes,
  insertDivider,
  sequence,
  textSelection,
  toggleList,
  toggleMark,
  toggleWrapper,
  type Command,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node, text } = buildWith(fixtureSchema);

const bold = fixtureSchema.mark('bold');

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const runs = (editor: EditingHarness, command: Command): boolean =>
  command(editor.state, (tr) => {
    editor.change(() => tr);
  });

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('toolbar state and commands', () => {
  it('reports the marks shared by the whole selection and the block and wrappers under it', () => {
    const editor = started(
      doc(
        node('paragraph', [text('ab', [bold]), 'cd']),
        node('blockquote', [node('heading', ['T'], { level: 2 })]),
      ),
      textSelection(2),
    );

    expect([...activeMarks(editor.state)]).toEqual(['bold']);

    editor.select(textSelection(1, 3));

    expect([...activeMarks(editor.state)]).toEqual(['bold']);

    editor.select(textSelection(1, 5));

    expect([...activeMarks(editor.state)]).toEqual([]);
    expect(activeBlock(editor.state)).toEqual({ type: 'paragraph', attrs: {} });

    editor.select(textSelection(9));

    expect(activeBlock(editor.state)).toEqual({ type: 'heading', attrs: { level: 2 } });
    expect(ancestorTypes(editor.state)).toEqual(['heading', 'blockquote']);
  });

  it('toggles a list on and off and switches its kind in one undo step', () => {
    const editor = started(doc(node('paragraph', ['a'])), textSelection(1));

    expect(runs(editor, toggleList('bullet_list'))).toBe(true);
    expect(editor.outline).toBe('bullet_list(list_item(paragraph("a")))');

    expect(runs(editor, toggleList('ordered_list'))).toBe(true);
    expect(editor.outline).toBe('ordered_list(list_item(paragraph("a")))');

    expect(editor.press('Mod-z')).toBe(true);
    expect(editor.outline).toBe('bullet_list(list_item(paragraph("a")))');

    expect(runs(editor, toggleList('bullet_list'))).toBe(true);
    expect(editor.outline).toBe('paragraph("a")');
  });

  it('wraps and unwraps a quote and runs nothing when a step fails', () => {
    const editor = started(
      doc(node('paragraph', ['a']), node('paragraph', ['b'])),
      textSelection(1),
    );

    expect(runs(editor, toggleWrapper('blockquote'))).toBe(true);
    expect(editor.outline).toBe('blockquote(paragraph("a")) paragraph("b")');
    expect(runs(editor, toggleWrapper('blockquote'))).toBe(true);
    expect(editor.outline).toBe('paragraph("a") paragraph("b")');
    expect(sequence(toggleMark('bold'), () => false)(editor.state)).toBe(false);
  });

  it('inserts a divider after a filled block and before an empty one', () => {
    const editor = started(doc(node('heading', ['T']), node('paragraph')), textSelection(1));

    expect(runs(editor, insertDivider())).toBe(true);
    expect(editor.outline).toBe('heading("T") divider paragraph() paragraph()');
    expect(editor.selection).toEqual(textSelection(5));

    editor.select(textSelection(7));

    expect(runs(editor, insertDivider())).toBe(true);
    expect(editor.outline).toBe('heading("T") divider paragraph() divider paragraph()');
  });
});
