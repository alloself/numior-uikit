import { describe, expect, it } from 'vite-plus/test';
import {
  createDoc,
  createState,
  insertParagraph,
  textSelection,
  type Command,
  type EditorState,
  type Selection,
} from '../src';
import { codeToParagraph, exitCode, indentCode, outdentCode } from '../src/commands/code';
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

const outline = (state: EditorState): string[] =>
  state.doc.root.content.map((block) =>
    block.kind === 'element'
      ? `${block.type}${block.attrs.language ? `[${String(block.attrs.language)}]` : ''}:${block.content
          .map((child) => (child.kind === 'text' ? child.text : ''))
          .join('')}`
      : '',
  );

const code = (text: string, at: number, head = at): EditorState =>
  stateOf(doc(node('code_block', text === '' ? [] : [text])), textSelection(at, head));

describe('code block commands', () => {
  it('turns a fence with a language into a code block on Enter', () => {
    const fenced = run(
      stateOf(doc(node('paragraph', ['```TS'])), textSelection(6)),
      insertParagraph,
    );

    expect(outline(fenced)).toEqual(['code_block[ts]:']);
    expect(fenced.selection).toEqual(textSelection(1));

    expect(
      outline(run(stateOf(doc(node('paragraph', ['``x'])), textSelection(4)), insertParagraph)),
    ).toEqual(['paragraph:``x', 'paragraph:']);
  });

  it('keeps the indent of the line on Enter and leaves the block from an empty last line', () => {
    const indented = run(code('  let x', 8), insertParagraph);

    expect(outline(indented)).toEqual(['code_block:  let x\n  ']);
    expect(indented.selection).toEqual(textSelection(11));

    const left = run(code('a\n', 3), insertParagraph);

    expect(outline(left)).toEqual(['code_block:a', 'paragraph:']);
    expect(left.selection).toEqual(textSelection(4));
  });

  it('leaves the block with Mod+Enter from anywhere and turns an empty block back into a paragraph', () => {
    expect(outline(run(code('one\ntwo', 2), exitCode))).toEqual([
      'code_block:one\ntwo',
      'paragraph:',
    ]);

    expect(outline(run(code('', 1), codeToParagraph))).toEqual(['paragraph:']);
    expect(codeToParagraph(code('x', 1))).toBe(false);
  });

  it('indents and outdents the caret, one line or every selected line', () => {
    expect(outline(run(code('let x', 1), indentCode))).toEqual(['code_block:  let x']);
    expect(outline(run(code('a\nb\nc', 2, 5), indentCode))).toEqual(['code_block:  a\n  b\nc']);
    expect(outline(run(code('  a\n b\nc', 2, 9), outdentCode))).toEqual(['code_block:a\nb\nc']);
  });
});
