import { afterEach, describe, expect, it } from 'vite-plus/test';
import { textSelection, turnIntoList, wrapInBlock, type ContentNode } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const p = (text?: string) => node('paragraph', text === undefined ? [] : [text]);

const li = (text: string, ...rest: readonly ContentNode[]) => node('list_item', [p(text), ...rest]);

const bullets = (...items: ReturnType<typeof li>[]) => node('bullet_list', items);

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const threeItems = () => started(doc(bullets(li('one'), li('two'), li('three'))), textSelection(1));

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('list and quote commands', () => {
  it('splits an item on Enter and lifts an empty item out of the list', () => {
    const editor = threeItems();

    editor.placeIn('two', 3);
    editor.enter();

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("two")) list_item(paragraph()) list_item(paragraph("three")))',
    );

    expect(editor.selection).toEqual(textSelection(17));

    editor.enter();

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("two"))) paragraph() bullet_list(list_item(paragraph("three")))',
    );

    expect(editor.selection).toEqual(textSelection(17));
  });

  it('starts an unchecked todo after a checked one', () => {
    const editor = started(
      doc(node('todo_list', [node('todo_item', [p('done')], { checked: true })])),
      textSelection(7),
    );

    editor.enter();

    expect(editor.outline).toBe(
      'todo_list(todo_item{checked=true}(paragraph("done")) todo_item(paragraph()))',
    );
  });

  it('nests an item with Tab under the previous one and brings it back with Shift+Tab', () => {
    const editor = threeItems();

    expect(editor.press('Tab')).toBe(false);

    editor.placeIn('two', 1);
    editor.press('Tab');

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one") bullet_list(list_item(paragraph("two")))) list_item(paragraph("three")))',
    );

    editor.placeIn('three');
    editor.press('Tab');

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one") bullet_list(list_item(paragraph("two")) list_item(paragraph("three")))))',
    );

    editor.placeIn('two', 1);
    editor.press('Shift-Tab');

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("two") bullet_list(list_item(paragraph("three")))))',
    );

    expect(editor.selection).toEqual(textSelection(11));
  });

  it('lifts an item to a paragraph with Backspace at its start and splits the list around it', () => {
    const editor = threeItems();

    editor.placeIn('two');
    editor.backspace();

    expect(editor.outline).toBe(
      'bullet_list(list_item(paragraph("one"))) paragraph("two") bullet_list(list_item(paragraph("three")))',
    );

    expect(editor.selection).toEqual(textSelection(10));

    const only = started(doc(bullets(li('a'))), textSelection(4));

    only.enter();
    only.placeIn('a');
    only.backspace();

    expect(only.outline).toBe('paragraph("a") bullet_list(list_item(paragraph()))');
  });

  it('lifts a quoted paragraph out of its quote with Backspace at its start', () => {
    const editor = started(doc(node('blockquote', [p('a'), p('b')])), textSelection(2));

    editor.backspace();

    expect(editor.outline).toBe('paragraph("a") blockquote(paragraph("b"))');

    const single = started(doc(node('blockquote', [p('a')])), textSelection(2));

    single.backspace();

    expect(single.outline).toBe('paragraph("a")');

    const toggle = started(doc(node('toggle', [p('t'), p('b')])), textSelection(2));

    toggle.backspace();

    expect(toggle.outline).toBe('toggle(paragraph("t") paragraph("b"))');
  });

  it('wraps a paragraph into a list or a quote through commands', () => {
    const editor = started(doc(p('a')), textSelection(1));

    editor.change((tr) => tr);

    expect(turnIntoList('ordered_list', { start: 3 })(editor.state)).toBe(true);
    expect(wrapInBlock('blockquote')(editor.state)).toBe(true);
    expect(wrapInBlock('divider')(editor.state)).toBe(false);
  });
});
