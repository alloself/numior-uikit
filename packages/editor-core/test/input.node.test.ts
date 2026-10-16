import { describe, expect, it } from 'vite-plus/test';
import {
  createDoc,
  createState,
  deleteText,
  insertLineBreak,
  insertParagraph,
  insertPlainText,
  nearestCursor,
  selectAtom,
  textPosition,
  textSelection,
  type Command,
  type ContentNode,
  type EditorState,
  type Selection,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const stateOf = (root: ReturnType<typeof doc>, selection: Selection): EditorState =>
  createState({ doc: createDoc(fixtureSchema, root), selection });

const run = (state: EditorState, command: Command): EditorState => {
  let next = state;

  command(state, (tr) => {
    next = state.apply(tr);
  });

  return next;
};

const textOfBlock = (block: ContentNode): string =>
  block.kind === 'element'
    ? block.content.map((child) => (child.kind === 'text' ? child.text : '·')).join('')
    : '';

const texts = (state: EditorState): string[] => state.doc.root.content.map(textOfBlock);

describe('input commands', () => {
  it('deletes a grapheme, a word or the rest of the line before the cursor', () => {
    const emoji = stateOf(doc(node('paragraph', ['a👍🏽'])), textSelection(6));
    const start = stateOf(doc(node('paragraph', ['one two three  '])), textSelection(16));

    expect(texts(run(emoji, deleteText('backward', 'character')))).toEqual(['a']);
    expect(texts(run(start, deleteText('backward', 'word')))).toEqual(['one two ']);
    expect(texts(run(start, deleteText('backward', 'line')))).toEqual(['']);
    const middle = stateOf(doc(node('paragraph', ['one two'])), textSelection(1));

    expect(texts(run(middle, deleteText('forward', 'word')))).toEqual([' two']);
    expect(texts(run(middle, deleteText('forward', 'character')))).toEqual(['ne two']);
  });

  it('joins blocks at their edges and clears a whole selected document to one block', () => {
    const blocks = doc(node('paragraph', ['ab']), node('paragraph', ['cd']));

    expect(
      texts(run(stateOf(blocks, textSelection(5)), deleteText('backward', 'character'))),
    ).toEqual(['abcd']);

    expect(
      texts(run(stateOf(blocks, textSelection(3)), deleteText('forward', 'character'))),
    ).toEqual(['abcd']);

    const cleared = run(stateOf(blocks, { kind: 'all' }), deleteText('backward', 'character'));

    expect(texts(cleared)).toEqual(['']);
    expect(cleared.selection).toEqual(textSelection(1));
  });

  it('splits blocks, breaks lines and keeps newlines inside code', () => {
    const start = stateOf(doc(node('paragraph', ['abcd'])), textSelection(3));

    expect(texts(run(start, insertParagraph))).toEqual(['ab', 'cd']);
    expect(texts(run(start, insertLineBreak))).toEqual(['ab·cd']);
    const code = stateOf(doc(node('code_block', ['let x'])), textSelection(4));

    expect(texts(run(code, insertParagraph))).toEqual(['let\n x']);
    expect(texts(run(code, insertLineBreak))).toEqual(['let\n x']);
  });

  it('pastes plain text as one block per line and as raw text in code', () => {
    const start = stateOf(doc(node('paragraph', ['[]'])), textSelection(2));

    expect(texts(run(start, insertPlainText('a\r\nb\nc')))).toEqual(['[a', 'b', 'c]']);
    expect(run(start, insertPlainText('a\r\nb\nc')).selection).toEqual(textSelection(9));
    const heading = stateOf(doc(node('heading', ['[]'], { level: 2 })), textSelection(2));
    const headings = run(heading, insertPlainText('a\nb')).doc.root.content;

    expect(headings.map((block) => (block.kind === 'element' ? block.attrs.level : 0))).toEqual([
      2, 2,
    ]);

    const code = stateOf(doc(node('code_block', [])), textSelection(1));

    expect(texts(run(code, insertPlainText('a\r\nb')))).toEqual(['a\nb']);
  });

  it('selects atoms beside the cursor and leaves them on either side', () => {
    const image = node('image', [], { src: 'a.png' });
    const mention = node('mention', [], { user: 'u', label: 'Ann' });
    const root = doc(node('paragraph', ['ab', mention]), image, node('paragraph', ['cd']));
    const atEnd = stateOf(root, textSelection(3));

    expect(run(atEnd, selectAtom('forward')).selection).toEqual({ kind: 'node', id: mention.id });
    const afterMention = stateOf(root, textSelection(4));
    const onImage = run(afterMention, selectAtom('forward'));

    expect(onImage.selection).toEqual({ kind: 'node', id: image.id });
    expect(run(onImage, selectAtom('forward')).selection).toEqual(textSelection(7));
    expect(run(onImage, selectAtom('backward', true)).selection).toEqual(textSelection(4));

    expect(run(stateOf(root, textSelection(1)), selectAtom('backward')).selection).toEqual(
      textSelection(1),
    );
  });

  it('selects a table of cells as one atom before Backspace deletes it', () => {
    const table = node('table', [
      node('table_head', [node('table_column', [], { name: 'A' })]),
      node('table_body', [node('table_row', [node('table_cell', [], { value: 'x' })])]),
    ]);

    const after = node('paragraph', ['cd']);
    const root = doc(node('paragraph', ['ab']), table, after);
    const start = createDoc(fixtureSchema, root).positionOf(after.id) ?? 0;

    const selected = run(
      stateOf(root, textSelection(start + 1)),
      deleteText('backward', 'character'),
    );

    expect(selected.selection).toEqual({ kind: 'node', id: table.id });
    expect(texts(run(selected, deleteText('backward', 'character')))).toEqual(['ab', 'cd']);
  });

  it('finds text positions with a direction and falls back the other way', () => {
    const root = createDoc(
      fixtureSchema,
      doc(node('paragraph', ['ab']), node('divider'), node('paragraph', ['cd'])),
    );

    expect(textPosition(root, 4, -1)).toBe(3);
    expect(textPosition(root, 4, 1)).toBe(6);
    expect(nearestCursor(root, 4, -1)).toEqual(textSelection(3));
    expect(textPosition(root, 0, -1)).toBe(1);
  });
});
