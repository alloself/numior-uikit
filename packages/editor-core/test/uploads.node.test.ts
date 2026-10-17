import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  baseKeymap,
  dropUploads,
  finishUpload,
  history,
  keymap,
  pendingUploads,
  startUploads,
  textSelection,
  undoDepth,
  uploadsOf,
  type EditorState,
  type Transaction,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const editing = (root: ReturnType<typeof doc>, at: number): EditingHarness => {
  harness = EditingHarness.of(root, textSelection(at), [
    pendingUploads,
    keymap(baseKeymap),
    history(),
  ]);

  return harness;
};

const image = (src: string) => (tr: Transaction) =>
  fixtureSchema.element('image', { id: tr.newId(), attrs: { src } });

const widgets = (state: EditorState) =>
  pendingUploads.props.decorations?.(state)?.widgets.map((widget) => [widget.key, widget.pos]);

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('pending uploads', () => {
  it('waits after the current paragraph, or before it when the paragraph is empty', () => {
    const filled = editing(doc(node('paragraph', ['Intro']), node('paragraph', ['Next'])), 3);

    filled.run(startUploads(['a', 'b']));

    expect(widgets(filled.state)).toEqual([
      ['a', 7],
      ['b', 7],
    ]);

    expect(filled.outline).toBe('paragraph("Intro") paragraph("Next")');
    expect(undoDepth(filled.state)).toBe(0);

    const empty = editing(doc(node('paragraph', ['Intro']), node('paragraph')), 8);

    empty.run(startUploads(['c']));

    expect(uploadsOf(empty.state)).toEqual([{ id: 'c', pos: 7 }]);
  });

  it('follows edits before its place and inserts the node there in one undoable step', () => {
    const editor = editing(doc(node('paragraph', ['Intro']), node('paragraph', ['Next'])), 6);

    editor.run(startUploads(['a', 'b']));
    editor.select(textSelection(1));
    editor.type('Big ');

    expect(uploadsOf(editor.state).map((upload) => upload.pos)).toEqual([11, 11]);
    expect(editor.run(finishUpload('a', image('a.png')))).toBe(true);
    expect(editor.outline).toBe('paragraph("Big Intro") image paragraph("Next")');
    expect(uploadsOf(editor.state)).toEqual([{ id: 'b', pos: 12 }]);

    editor.run(finishUpload('b', image('b.png')));

    expect(
      editor.state.doc.root.content.map((block) =>
        block.kind === 'element' ? String(block.attrs.src ?? block.type) : '',
      ),
    ).toEqual(['paragraph', 'a.png', 'b.png', 'paragraph']);

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("Big Intro") image paragraph("Next")');
    expect(uploadsOf(editor.state)).toEqual([]);
  });

  it('drops a cancelled or failed upload without a trace in the document or the history', () => {
    const editor = editing(doc(node('paragraph', ['Intro'])), 6);

    editor.run(startUploads(['a']));

    expect(editor.run(dropUploads(['a']))).toBe(true);
    expect(uploadsOf(editor.state)).toEqual([]);
    expect(editor.run(dropUploads(['a']))).toBe(false);
    expect(editor.run(finishUpload('a', image('a.png')))).toBe(false);
    expect(editor.outline).toBe('paragraph("Intro")');
    expect(undoDepth(editor.state)).toBe(0);
  });

  it('walks out of a container that cannot hold the node', () => {
    const editor = editing(
      doc(
        node('bullet_list', [node('list_item', [node('paragraph', ['Item'])])]),
        node('paragraph', ['After']),
      ),
      4,
    );

    editor.run(startUploads(['a']));
    editor.run(finishUpload('a', image('a.png')));

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("Item"))) image paragraph("After")',
    );
  });

  it('stays between blocks when the blocks around it join', () => {
    const editor = editing(doc(node('paragraph', ['A']), node('paragraph', ['B'])), 2);

    editor.run(startUploads(['a']));

    expect(uploadsOf(editor.state)).toEqual([{ id: 'a', pos: 3 }]);

    editor.select(textSelection(4));
    editor.backspace();

    expect(editor.outline).toBe('paragraph("AB")');
    expect(uploadsOf(editor.state)).toEqual([{ id: 'a', pos: 4 }]);
    expect(editor.run(startUploads([]))).toBe(false);
  });
});
