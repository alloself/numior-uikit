import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  definePlugin,
  insertBelow,
  insertDivider,
  setBlockType,
  textSelection,
  toggleList,
  type Command,
  type ContentNode,
  type ElementNode,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const p = (text?: string) => node('paragraph', text === undefined ? [] : [text]);

const li = (text: string, ...rest: readonly ContentNode[]) => node('list_item', [p(text), ...rest]);

const bullets = (...items: ReturnType<typeof li>[]) => node('bullet_list', items);

const heading: Command = insertBelow(setBlockType('heading', { level: 2 }));

const list: Command = insertBelow(toggleList('bullet_list'));

const divider: Command = insertBelow(insertDivider());

const folded = definePlugin({
  name: 'folded',
  props: { conceals: (parent, index) => parent.type === 'toggle' && index > 0 },
});

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const caretIn = (text: string, ...blocks: readonly ElementNode[]): EditingHarness => {
  const editor = started(doc(...blocks), textSelection(1));

  editor.placeIn(text, 1);
  return editor;
};

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('a block inserted below the caret', () => {
  it('opens a list under a heading and leaves the heading as it was', () => {
    const editor = caretIn('Title', node('heading', ['Title'], { level: 2 }), p('next'));

    expect(editor.run(list)).toBe(true);

    expect(editor.outline).toBe(
      'heading{level=2}("Title") bullet_list(list_item(paragraph())) paragraph("next")',
    );

    editor.type('x');

    expect(editor.outline).toContain('list_item(paragraph("x"))');
  });

  it('opens a heading under a paragraph with text and takes it back in one undo', () => {
    const editor = caretIn('body', p('body'));

    expect(editor.run(heading)).toBe(true);
    expect(editor.outline).toBe('paragraph("body") heading{level=2}()');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("body")');
  });

  it('turns the empty line under the caret instead of adding one more', () => {
    const editor = started(doc(p('above'), p()), textSelection(8));

    expect(editor.run(heading)).toBe(true);
    expect(editor.outline).toBe('paragraph("above") heading{level=2}()');
  });

  it('puts a paragraph below when the block asked for is the plain line itself', () => {
    const editor = caretIn('Title', node('heading', ['Title']));

    expect(editor.run(insertBelow(setBlockType('paragraph')))).toBe(true);
    expect(editor.outline).toBe('heading("Title") paragraph()');
  });

  it('goes below the whole list from an item, a nested item and an empty item', () => {
    const fromItem = caretIn('two', bullets(li('one'), li('two')), p('after'));

    expect(fromItem.run(heading)).toBe(true);

    expect(fromItem.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("two"))) heading{level=2}() paragraph("after")',
    );

    const fromNested = caretIn('deep', bullets(li('one', bullets(li('deep')))));

    expect(fromNested.run(divider)).toBe(true);

    expect(fromNested.outline).toBe(
      'bullet_list(list_item(paragraph("one") bullet_list(list_item(paragraph("deep"))))) divider paragraph()',
    );

    const fromEmpty = started(doc(bullets(li('one'), node('list_item', [p()]))), textSelection(1));

    fromEmpty.select(textSelection(fromEmpty.state.doc.size - 3));

    expect(fromEmpty.run(list)).toBe(true);

    expect(fromEmpty.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph()) list_item(paragraph()))',
    );
  });

  it('goes below a todo item and below a block of code', () => {
    const todo = caretIn('task', node('todo_list', [node('todo_item', [p('task')])]));

    expect(todo.run(heading)).toBe(true);
    expect(todo.outline).toBe('todo_list(todo_item(paragraph("task"))) heading{level=2}()');

    const code = caretIn('let x', node('code_block', ['let x']));

    expect(code.run(list)).toBe(true);
    expect(code.outline).toBe('code_block("let x") bullet_list(list_item(paragraph()))');
  });

  it('stays inside a quote, a callout and a column', () => {
    const quote = caretIn('said', node('blockquote', [p('said')]));

    expect(quote.run(heading)).toBe(true);
    expect(quote.outline).toBe('blockquote(paragraph("said") heading{level=2}())');

    const callout = caretIn('note', node('callout', [p('note')]));

    expect(callout.run(divider)).toBe(true);
    expect(callout.outline).toBe('callout(paragraph("note") divider paragraph())');

    const column = caretIn(
      'left',
      node('columns', [node('column', [p('left')]), node('column', [p('right')])]),
    );

    expect(column.run(list)).toBe(true);

    expect(column.outline).toBe(
      'columns(column(paragraph("left") bullet_list(list_item(paragraph()))) column(paragraph("right")))',
    );
  });

  it('stays inside an open toggle, right under its title', () => {
    const inToggle = caretIn('title', node('toggle', [p('title'), p('body')], { open: true }));

    expect(inToggle.run(heading)).toBe(true);

    expect(inToggle.outline).toBe(
      'toggle{open=true}(paragraph("title") heading{level=2}() paragraph("body"))',
    );
  });

  it('goes below a folded block instead of into the part it hides', () => {
    const editor = started(doc(node('toggle', [p('title'), p('body')])), textSelection(1), [
      folded,
    ]);

    editor.placeIn('title', 1);

    expect(editor.run(heading)).toBe(true);

    expect(editor.outline).toBe('toggle(paragraph("title") paragraph("body")) heading{level=2}()');
  });

  it('goes below a selected picture, a selected run of blocks and the whole document', () => {
    const picture = node('image', [], { src: '/a.png' });
    const withPicture = started(doc(p('above'), picture, p('below')), textSelection(1));

    withPicture.select({ kind: 'node', id: picture.id });

    expect(withPicture.run(heading)).toBe(true);

    expect(withPicture.outline).toBe(
      'paragraph("above") image heading{level=2}() paragraph("below")',
    );

    const first = p('one');
    const second = p('two');
    const blocks = started(doc(first, second, p('three')), textSelection(1));

    blocks.select({ kind: 'block', anchorId: first.id, headId: second.id });

    expect(blocks.run(divider)).toBe(true);

    expect(blocks.outline).toBe(
      'paragraph("one") paragraph("two") divider paragraph() paragraph("three")',
    );

    const whole = started(doc(p('one'), p('two')), textSelection(1));

    whole.select({ kind: 'all' });

    expect(whole.run(heading)).toBe(true);
    expect(whole.outline).toBe('paragraph("one") paragraph("two") heading{level=2}()');
  });

  it('opens a line in the gap beside a picture for a block that needs a line', () => {
    const picture = node('image', [], { src: '/a.png' });
    const editor = started(doc(picture), textSelection(0));

    editor.select({ kind: 'gap', id: picture.id, side: 'start' });

    expect(editor.run(heading)).toBe(true);
    expect(editor.outline).toBe('heading{level=2}() image');

    editor.select({ kind: 'gap', id: picture.id, side: 'end' });

    expect(editor.run(divider)).toBe(true);
    expect(editor.outline).toBe('heading{level=2}() image divider');
  });

  it('goes below the block where a selection of text ends', () => {
    const editor = started(doc(p('one'), p('two'), p('three')), textSelection(2, 8));

    expect(editor.run(heading)).toBe(true);

    expect(editor.outline).toBe(
      'paragraph("one") paragraph("two") heading{level=2}() paragraph("three")',
    );
  });

  it('answers a dry run without touching the document', () => {
    const editor = caretIn('two', bullets(li('one'), li('two')));
    const before = editor.outline;

    expect(heading(editor.state)).toBe(true);
    expect(list(editor.state)).toBe(true);
    expect(divider(editor.state)).toBe(true);
    expect(editor.outline).toBe(before);
  });
});
