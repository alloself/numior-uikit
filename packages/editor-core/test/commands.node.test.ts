import { describe, expect, it } from 'vitest';
import {
  chainCommands,
  createDoc,
  createState,
  deleteSelection,
  joinBackward,
  joinForward,
  selectAll,
  setBlockType,
  splitBlock,
  textSelection,
  toggleMark,
  type Command,
  type EditorState,
  type Selection,
} from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith();

const stateAt = (selection: Selection): EditorState =>
  createState({
    doc: createDoc(
      notes,
      doc(
        node('heading', ['Title']),
        node('paragraph', ['Hello ', text('bold', [notes.mark('bold')])]),
        node('image', [], { src: 'a.png' }),
        node('paragraph', ['End']),
      ),
    ),
    selection,
  });

const run = (command: Command, state: EditorState): EditorState | undefined => {
  let next: EditorState | undefined;

  const handled = command(state, (tr) => {
    next = state.apply(tr);
  });

  return handled ? next : undefined;
};

const blocks = (state: EditorState | undefined): string[] =>
  state?.doc.root.content.map((block) =>
    block.kind === 'element'
      ? `${block.type}:${state.doc.textBetween(state.doc.positionOf(block.id) ?? 0, (state.doc.positionOf(block.id) ?? 0) + block.size)}`
      : '',
  ) ?? [];

describe('commands', () => {
  it('splits a block in the middle and turns a heading end into a new paragraph', () => {
    const middle = run(splitBlock, stateAt(textSelection(10)));

    expect(blocks(middle)).toEqual([
      'heading:Title',
      'paragraph:He',
      'paragraph:llo bold',
      'image:',
      'paragraph:End',
    ]);

    expect(middle?.selection).toEqual(textSelection(12));

    const end = run(splitBlock, stateAt(textSelection(6)));

    expect(blocks(end).slice(0, 2)).toEqual(['heading:Title', 'paragraph:']);

    expect(run(splitBlock, stateAt(textSelection(9, 11)))?.doc.textBetween(0, 30, '|')).toBe(
      'Title|H|lo bold|End',
    );

    expect(run(splitBlock, stateAt({ kind: 'all' }))).toBeUndefined();
  });

  it('joins with the block before or after and removes a leaf neighbour', () => {
    expect(blocks(run(joinBackward, stateAt(textSelection(8))))).toEqual([
      'heading:TitleHello bold',
      'image:',
      'paragraph:End',
    ]);

    expect(run(joinBackward, stateAt(textSelection(8)))?.selection).toEqual(textSelection(6));

    expect(blocks(run(joinBackward, stateAt(textSelection(20))))).toEqual([
      'heading:Title',
      'paragraph:Hello bold',
      'paragraph:End',
    ]);

    expect(blocks(run(joinForward, stateAt(textSelection(6))))).toEqual([
      'heading:TitleHello bold',
      'image:',
      'paragraph:End',
    ]);

    expect(blocks(run(joinForward, stateAt(textSelection(18))))).toEqual([
      'heading:Title',
      'paragraph:Hello bold',
      'paragraph:End',
    ]);

    expect(run(joinBackward, stateAt(textSelection(1)))).toBeUndefined();
    expect(run(joinBackward, stateAt(textSelection(9)))).toBeUndefined();
    expect(run(joinForward, stateAt(textSelection(2, 4)))).toBeUndefined();
  });

  it('toggles marks on ranges and as stored marks at a cursor', () => {
    const bolded = run(toggleMark('bold'), stateAt(textSelection(8, 14)));

    expect(bolded?.doc.root.content[1]).toMatchObject({
      content: [{ text: 'Hello bold', marks: [{ type: 'bold' }] }],
    });

    const unbolded = run(toggleMark('bold'), stateAt(textSelection(14, 18)));

    expect(unbolded?.doc.root.content[1]).toMatchObject({
      content: [{ text: 'Hello bold', marks: [] }],
    });

    expect(
      run(toggleMark('italic'), stateAt(textSelection(9)))?.storedMarks?.map((mark) => mark.type),
    ).toEqual(['italic']);

    expect(run(toggleMark('bold'), stateAt(textSelection(16)))?.storedMarks).toEqual([]);
  });

  it('changes the type of the blocks in the selection and keeps their ids', () => {
    const state = stateAt(textSelection(2, 10));

    const before = state.doc.root.content
      .slice(0, 2)
      .map((block) => (block.kind === 'element' ? block.id : ''));

    const changed = run(setBlockType('heading', { level: 2 }), state);

    expect(
      changed?.doc.root.content
        .slice(0, 2)
        .map((block) =>
          block.kind === 'element' ? [block.type, block.id, block.attrs['level']] : [],
        ),
    ).toEqual([
      ['heading', before[0], 2],
      ['heading', before[1], 2],
    ]);

    expect(run(setBlockType('code'), stateAt(textSelection(10)))).toBeUndefined();
    const plain = stateAt(textSelection(1));
    const image = plain.doc.root.content[2];

    const onImage = createState({
      doc: plain.doc,
      selection: { kind: 'node', id: image?.kind === 'element' ? image.id : '' },
    });

    expect(run(setBlockType('paragraph'), onImage)).toBeUndefined();
  });

  it('deletes and selects everything and chains commands until one handles the state', () => {
    expect(run(deleteSelection, stateAt(textSelection(2, 4)))?.doc.textBetween(0, 6)).toBe('Tle');
    expect(run(deleteSelection, stateAt(textSelection(2)))).toBeUndefined();
    expect(run(selectAll, stateAt(textSelection(2)))?.selection).toEqual({ kind: 'all' });

    expect(
      run(chainCommands(deleteSelection, selectAll), stateAt(textSelection(2)))?.selection,
    ).toEqual({ kind: 'all' });

    expect(chainCommands(deleteSelection, joinBackward)(stateAt(textSelection(2)))).toBe(false);
  });
});
