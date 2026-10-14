import { afterEach, describe, expect, it } from 'vitest';
import { textSelection } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node, text } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const blank = (): EditingHarness => started(doc(node('paragraph')), textSelection(1));

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('markdown input rules', () => {
  it.each([
    ['# x', 'heading("x")'],
    ['### x', 'heading{level=3}("x")'],
    ['> x', 'blockquote(paragraph("x"))'],
    ['- x', 'bullet_list(list_item(paragraph("x")))'],
    ['* x', 'bullet_list(list_item(paragraph("x")))'],
    ['7. x', 'ordered_list{start=7}(list_item(paragraph("x")))'],
    ['[ ] x', 'todo_list(todo_item(paragraph("x")))'],
    ['[x] x', 'todo_list(todo_item{checked=true}(paragraph("x")))'],
    ['```x', 'code_block("x")'],
    ['---x', 'divider paragraph("x")'],
  ])('turns %j typed at the start of a block into a block', (typed, outline) => {
    const editor = blank();

    editor.type(typed);

    expect(editor.outline).toBe(outline);
  });

  it('marks text between inline markers and types on without the mark', () => {
    const editor = blank();

    editor.type('a **b** *i* `c` ~~s~~ z');

    expect(editor.outline).toBe(
      'paragraph("a " bold:"b" " " italic:"i" " " code:"c" " " strike:"s" " z")',
    );
  });

  it('undoes a rule with Backspace right after it fired and keeps the typed text', () => {
    const editor = blank();

    editor.type('# ');

    expect(editor.outline).toBe('heading()');

    editor.backspace();

    expect(editor.outline).toBe('paragraph("# ")');
    expect(editor.selection).toEqual(textSelection(3));

    editor.backspace();

    expect(editor.outline).toBe('paragraph("#")');
  });

  it('fires on composed text and joins a new list item into the list above', () => {
    const composed = blank();

    composed.composeText('-', 1);
    composed.composeText(' ', 2);

    expect(composed.outline).toBe('bullet_list(list_item(paragraph()))');

    const below = started(
      doc(node('bullet_list', [node('list_item', [node('paragraph', ['a'])])]), node('paragraph')),
      textSelection(8),
    );

    below.type('- b');

    expect(below.outline).toBe('bullet_list(list_item(paragraph("a")) list_item(paragraph("b")))');
  });

  it('leaves code and blocks that cannot change as typed', () => {
    const code = started(doc(node('code_block')), textSelection(1));

    code.type('# **a**');

    expect(code.outline).toBe('code_block("# **a**")');

    const marked = started(
      doc(node('paragraph', [text('b', [fixtureSchema.mark('bold')])])),
      textSelection(1),
    );

    marked.type('```');

    expect(marked.outline).toBe('paragraph("```" bold:"b")');

    const cell = started(
      doc(node('table', [node('table_row', [node('table_cell', [node('paragraph')])])])),
      textSelection(4),
    );

    cell.type('- ');

    expect(cell.outline).toBe('table(table_row(table_cell(paragraph("- "))))');
  });
});
