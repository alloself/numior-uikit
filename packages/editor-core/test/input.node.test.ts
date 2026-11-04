import { describe, expect, it } from 'vite-plus/test';
import {
  createDoc,
  createState,
  deleteText,
  insertLineBreak,
  insertParagraph,
  intentCommand,
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
import { caretAtEnd, insertDivider } from '../src/commands/blocks';
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

const types = (state: EditorState): string[] =>
  state.doc.root.content.map((block) => (block.kind === 'element' ? block.type : 'text'));

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

  it('selects inline atoms and puts the caret beside block atoms with the arrows', () => {
    const image = node('image', [], { src: 'a.png' });
    const mention = node('mention', [], { user: 'u', label: 'Ann' });
    const root = doc(node('paragraph', ['ab', mention]), image, node('paragraph', ['cd']));
    const atEnd = stateOf(root, textSelection(3));

    expect(run(atEnd, selectAtom('forward')).selection).toEqual({ kind: 'node', id: mention.id });

    const afterMention = stateOf(root, textSelection(4));
    const beforeImage = run(afterMention, selectAtom('forward'));

    expect(beforeImage.selection).toEqual({ kind: 'gap', id: image.id, side: 'start' });

    const afterImage = run(beforeImage, selectAtom('forward'));

    expect(afterImage.selection).toEqual({ kind: 'gap', id: image.id, side: 'end' });
    expect(run(afterImage, selectAtom('forward')).selection).toEqual(textSelection(7));
    expect(run(afterImage, selectAtom('backward', true)).selection).toEqual(textSelection(4));
    expect(run(beforeImage, selectAtom('backward')).selection).toEqual(textSelection(4));

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

  it('steps between neighbouring atoms and deletes a selected one towards the key', () => {
    const image = node('image', [], { src: 'a.png' });
    const divider = node('divider');

    const root = doc(
      node('paragraph', ['a']),
      image,
      divider,
      node('paragraph'),
      node('paragraph', ['z']),
    );

    const onImage = stateOf(root, { kind: 'node', id: image.id });
    const onDivider = stateOf(root, { kind: 'node', id: divider.id });
    const afterImage = run(onImage, selectAtom('forward'));

    expect(afterImage.selection).toEqual({ kind: 'gap', id: image.id, side: 'end' });

    expect(run(afterImage, selectAtom('forward')).selection).toEqual({
      kind: 'gap',
      id: divider.id,
      side: 'start',
    });

    expect(run(onDivider, selectAtom('backward')).selection).toEqual({
      kind: 'gap',
      id: divider.id,
      side: 'start',
    });

    const emptied = run(stateOf(root, textSelection(6)), deleteText('backward', 'character'));

    expect(types(emptied)).toEqual(['paragraph', 'image', 'divider', 'paragraph']);
    expect(emptied.selection).toEqual({ kind: 'gap', id: divider.id, side: 'end' });

    expect(run(emptied, deleteText('backward', 'character')).selection).toEqual({
      kind: 'node',
      id: divider.id,
    });

    const back = run(onDivider, deleteText('backward', 'character'));

    expect(types(back)).toEqual(['paragraph', 'image', 'paragraph', 'paragraph']);
    expect(back.selection).toEqual({ kind: 'gap', id: image.id, side: 'end' });

    expect(run(onImage, deleteText('forward', 'character')).selection).toEqual({
      kind: 'gap',
      id: divider.id,
      side: 'start',
    });

    expect(run(onImage, deleteText('backward', 'character')).selection).toEqual(textSelection(2));
  });

  it('types, breaks lines and deletes at a caret beside a block without text', () => {
    const image = node('image', [], { src: 'a.png' });
    const divider = node('divider');
    const root = doc(node('paragraph', ['a']), image, node('paragraph'), divider);
    const after = stateOf(root, { kind: 'gap', id: image.id, side: 'end' });
    const before = stateOf(root, { kind: 'gap', id: image.id, side: 'start' });
    const typed = run(after, intentCommand({ kind: 'insertText', text: 'x' }));

    expect(texts(typed)).toEqual(['a', '', 'x', '', '']);
    expect(typed.selection).toEqual(textSelection(6));

    const broken = run(before, intentCommand({ kind: 'insertParagraph' }));

    expect(types(broken)).toEqual(['paragraph', 'paragraph', 'image', 'paragraph', 'divider']);
    expect(broken.selection).toEqual(before.selection);
    expect(run(before, deleteText('backward', 'character')).selection).toEqual(textSelection(2));

    expect(run(before, deleteText('forward', 'character')).selection).toEqual({
      kind: 'node',
      id: image.id,
    });

    const cleared = run(after, deleteText('forward', 'character'));

    expect(types(cleared)).toEqual(['paragraph', 'image', 'divider']);
    expect(cleared.selection).toEqual(after.selection);

    const ruled = run(after, insertDivider());
    const added = ruled.doc.root.content[2];

    expect(types(ruled)).toEqual(['paragraph', 'image', 'divider', 'paragraph', 'divider']);

    expect(ruled.selection).toEqual({
      kind: 'gap',
      id: added?.kind === 'element' ? added.id : '',
      side: 'end',
    });
  });

  it('leaves an empty line where the last block of a container was deleted', () => {
    const rule = node('divider');

    const only = run(
      stateOf(doc(rule), { kind: 'node', id: rule.id }),
      deleteText('backward', 'character'),
    );

    expect(types(only)).toEqual(['paragraph']);
    expect(only.selection).toEqual(textSelection(1));

    const image = node('image', [], { src: 'a.png' });

    const columns = doc(
      node('columns', [node('column', [image]), node('column', [node('paragraph', ['x'])])]),
    );

    const cleared = run(
      stateOf(columns, { kind: 'node', id: image.id }),
      deleteText('forward', 'character'),
    );

    const left = cleared.doc.root.content[0];
    const first = left?.kind === 'element' ? left.content[0] : undefined;

    expect(first?.kind === 'element' ? first.content.map(textOfBlock) : []).toEqual(['']);
    expect(cleared.selection).toEqual(textSelection(3));
  });

  it('opens a paragraph after a selected block, leaves a container from its empty last line and reaches the end', () => {
    const rule = stateOf(doc(node('paragraph', ['a']), node('divider')), textSelection(1));
    const divider = rule.doc.root.content[1];

    const opened = run(
      rule.apply(
        rule.tr.setSelection({ kind: 'node', id: divider?.kind === 'element' ? divider.id : '' }),
      ),
      insertParagraph,
    );

    expect(types(opened)).toEqual(['paragraph', 'divider', 'paragraph']);
    expect(opened.selection).toEqual(textSelection(5));

    for (const wrapper of ['blockquote', 'toggle']) {
      const nested = doc(node(wrapper, [node('paragraph', ['q']), node('paragraph')]));
      const inside = stateOf(nested, textSelection(5));
      const left = run(inside, insertParagraph);

      expect(types(left)).toEqual([wrapper, 'paragraph']);
      expect(left.selection).toEqual(textSelection(6));
    }

    const single = stateOf(doc(node('callout', [node('paragraph')])), textSelection(2));

    expect(types(run(single, insertParagraph))).toEqual(['callout']);

    const ended = run(rule, caretAtEnd);

    expect(types(ended)).toEqual(['paragraph', 'divider']);

    expect(ended.selection).toEqual({
      kind: 'gap',
      id: divider?.kind === 'element' ? divider.id : '',
      side: 'end',
    });

    const written = stateOf(doc(node('paragraph', ['text'])), textSelection(1));

    expect(types(run(written, caretAtEnd))).toEqual(['paragraph']);
    expect(run(written, caretAtEnd).selection).toEqual(textSelection(5));
  });

  it('removes an empty line beside a list with Backspace and Delete', () => {
    const list = () => node('bullet_list', [node('list_item', [node('paragraph', ['item'])])]);

    const before = stateOf(
      doc(node('paragraph', ['a']), node('paragraph'), list()),
      textSelection(4),
    );

    const first = stateOf(doc(node('paragraph'), list()), textSelection(1));

    const after = stateOf(
      doc(list(), node('paragraph'), node('paragraph', ['z'])),
      textSelection(11),
    );

    expect(types(run(before, deleteText('forward', 'character')))).toEqual([
      'paragraph',
      'bullet_list',
    ]);

    expect(run(before, deleteText('forward', 'character')).selection).toEqual(textSelection(6));
    expect(types(run(first, deleteText('forward', 'character')))).toEqual(['bullet_list']);
    expect(types(run(first, deleteText('backward', 'character')))).toEqual(['bullet_list']);

    expect(types(run(after, deleteText('backward', 'character')))).toEqual([
      'bullet_list',
      'paragraph',
    ]);

    expect(run(after, deleteText('backward', 'character')).selection).toEqual(textSelection(7));
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
