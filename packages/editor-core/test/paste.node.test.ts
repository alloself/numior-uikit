import { afterEach, describe, expect, it } from 'vite-plus/test';
import { textSelection, type ContentNode } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const p = (text?: string) => node('paragraph', text === undefined ? [] : [text]);

const li = (text: string, ...rest: readonly ContentNode[]) => node('list_item', [p(text), ...rest]);

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const inMiddle = () => {
  const editor = started(doc(p('abcd')), textSelection(1));

  editor.placeIn('abcd', 2);
  return editor;
};

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('pasting HTML', () => {
  it('pastes one formatted line into the current block and puts the cursor after it', () => {
    const editor = inMiddle();

    expect(editor.paste('<b>X</b>y', 'Xy')).toBe(true);
    expect(editor.outline).toBe('paragraph("ab" bold:"X" "ycd")');
    expect(editor.selection).toEqual(textSelection(5));
  });

  it('splits the block around several pasted blocks and merges their edges', () => {
    const editor = inMiddle();

    editor.paste('<p>one</p><ul><li>list</li></ul><h2>two</h2>');

    expect(editor.outline).toBe(
      'paragraph("abone") bullet_list(list_item(paragraph("list"))) heading{level=2}("twocd")',
    );

    expect(editor.selection).toEqual(textSelection(21));
  });

  it('opens a block around pasted content that starts and ends with a container', () => {
    const editor = inMiddle();

    editor.paste('<ul><li>x</li></ul><hr>');

    expect(editor.outline).toBe(
      'paragraph("ab") bullet_list(list_item(paragraph("x"))) divider paragraph("cd")',
    );
  });

  it('replaces an empty block with the pasted blocks as they are', () => {
    const editor = started(doc(p('a'), p()), textSelection(4));

    editor.paste('<h2>Title</h2><p>body</p>');

    expect(editor.outline).toBe('paragraph("a") heading{level=2}("Title") paragraph("body")');
    expect(editor.selection).toEqual(textSelection(15));
  });

  it('puts the caret after a pasted block without text that ends the paste', () => {
    const editor = started(doc(p('a'), p(), p('z')), textSelection(4));

    editor.paste('<p>b</p><hr>');

    expect(editor.outline).toBe('paragraph("a") paragraph("b") divider paragraph("z")');
    expect(editor.selection.kind).toBe('gap');
  });

  it('flattens blocks that the surrounding container cannot hold into its own blocks', () => {
    const editor = started(doc(node('bullet_list', [li('ab')])), textSelection(3));

    editor.placeIn('ab', 2);
    editor.paste('<p>a</p><h1>T</h1><pre>x\ny</pre>');

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("aba") paragraph("T") paragraph("x") paragraph("y")))',
    );
  });

  it('pastes the plain text inside code and when the HTML holds nothing readable', () => {
    const code = started(doc(node('code_block', ['let x'])), textSelection(1));

    code.placeIn('let x', 3);
    code.paste('<p>a</p><p>b</p>', 'a\nb');

    expect(code.outline).toBe('code_block("leta\\nb x")');

    const empty = started(doc(p('ab')), textSelection(2));

    empty.paste('<style>p{}</style>', 'plain');

    expect(empty.outline).toBe('paragraph("aplainb")');
  });

  it('replaces the selection and undoes the whole paste in one step', () => {
    const editor = started(doc(p('abcd')), textSelection(2, 4));

    editor.paste('<p>one</p><p>two</p>');

    expect(editor.outline).toBe('paragraph("aone") paragraph("twod")');
    expect(editor.press('Mod-z')).toBe(true);
    expect(editor.outline).toBe('paragraph("abcd")');
  });
});
