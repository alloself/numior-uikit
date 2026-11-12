import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createDoc,
  createState,
  insertDivider,
  liftListItem,
  sinkListItem,
  textSelection,
  toggleList,
  toggleWrapper,
  turnIntoList,
  wrapInBlock,
  type Command,
  type ContentNode,
} from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const p = (text?: string) => node('paragraph', text === undefined ? [] : [text]);

const li = (text: string, ...rest: readonly ContentNode[]) => node('list_item', [p(text), ...rest]);

const bullets = (...items: ReturnType<typeof li>[]) => node('bullet_list', items);

const DRY_COMMANDS: readonly (readonly [string, Command])[] = [
  ['bullet list', toggleList('bullet_list')],
  ['ordered list', toggleList('ordered_list')],
  ['todo list', toggleList('todo_list')],
  ['quote', toggleWrapper('blockquote')],
  ['list wrap', turnIntoList('bullet_list')],
  ['callout wrap', wrapInBlock('callout')],
  ['divider', insertDivider()],
  ['lift item', liftListItem],
  ['sink item', sinkListItem],
];

const textblockStarts = (seed: number): number[] => {
  const generated = generateDoc(fixtureSchema, { blocks: 40, seed });
  const starts: number[] = [];

  generated.nodesBetween(0, generated.size, (child, pos) => {
    if (child.kind === 'element' && fixtureSchema.nodes.get(child.type)?.inlineContent === true) {
      starts.push(pos + 1);
    }
    return true;
  });

  return starts;
};

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const nestedWithTail = () =>
  started(doc(bullets(li('one', bullets(li('two'), li('three')), p('tail')))), textSelection(1));

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

  it('lifts, nests and takes out of a quote the blocks themselves, not copies of them', () => {
    const editor = threeItems();
    const ids = [editor.blockOf('two'), editor.blockOf('three')];

    editor.placeIn('two', 1);
    editor.press('Shift-Tab');

    expect([editor.blockOf('two'), editor.blockOf('three')]).toEqual(ids);

    const quote = started(doc(node('blockquote', [p('a'), p('b')])), textSelection(2));
    const quoted = quote.blockOf('a');

    quote.backspace();

    expect(quote.blockOf('a')).toBe(quoted);
  });

  it('lifts a nested item past the paragraphs that follow the nested list in its parent', () => {
    const first = nestedWithTail();
    const before = first.outline;

    first.placeIn('two', 1);
    first.press('Shift-Tab');

    expect(first.outline).toBe(
      'bullet_list(list_item(paragraph("one") paragraph("tail")) list_item(paragraph("two") bullet_list(list_item(paragraph("three")))))',
    );

    first.press('Mod-z');

    expect(first.outline).toBe(before);

    const last = nestedWithTail();

    last.placeIn('three', 1);
    last.press('Shift-Tab');

    expect(last.outline).toBe(
      'bullet_list(list_item(paragraph("one") bullet_list(list_item(paragraph("two"))) paragraph("tail")) list_item(paragraph("three")))',
    );

    last.press('Mod-z');

    expect(last.outline).toBe(before);
  });

  it('wraps a paragraph into a list or a quote through commands', () => {
    const editor = started(doc(p('a')), textSelection(1));

    editor.change((tr) => tr);

    expect(turnIntoList('ordered_list', { start: 3 })(editor.state)).toBe(true);
    expect(wrapInBlock('blockquote')(editor.state)).toBe(true);
    expect(wrapInBlock('divider')(editor.state)).toBe(false);
  });

  it('answers a dry run of the toolbar commands without a transaction the way a real run does on every textblock', () => {
    const mismatches = [3, 11, 29].flatMap((seed) => {
      const generated = generateDoc(fixtureSchema, { blocks: 40, seed });

      return textblockStarts(seed).flatMap((pos) => {
        const state = createState({ doc: generated, selection: textSelection(pos) });

        return DRY_COMMANDS.flatMap(([name, command]) => {
          const built = vi.spyOn(state, 'tr', 'get');
          const dry = command(state);
          const touched = built.mock.calls.length;

          built.mockRestore();

          const real = command(state, () => undefined);
          const where = `${name} at ${String(pos)} of seed ${String(seed)}`;

          return [
            ...(dry === real ? [] : [`${where}: dry ${String(dry)}, real ${String(real)}`]),
            ...(touched === 0 ? [] : [`${where}: built a transaction`]),
          ];
        });
      });
    });

    expect(mismatches).toEqual([]);
  });

  it('answers whether a block can be inserted without building a transaction', () => {
    const image = node('image', [], { src: 'a.png' });
    const root = createDoc(fixtureSchema, doc(p('text'), p(), image));

    const states = [
      createState({ doc: root, selection: textSelection(2) }),
      createState({ doc: root, selection: textSelection(7) }),
      createState({ doc: root, selection: { kind: 'gap', id: image.id, side: 'end' } }),
      createState({ doc: root, selection: { kind: 'gap', id: image.id, side: 'start' } }),
    ];

    const answers = states.map((state) => {
      const built = vi.spyOn(state, 'tr', 'get');
      const dry = insertDivider()(state);
      const touched = built.mock.calls.length;

      built.mockRestore();

      return { dry, touched, real: insertDivider()(state, () => undefined) };
    });

    expect(answers.map((answer) => answer.touched)).toEqual([0, 0, 0, 0]);
    expect(answers.map((answer) => answer.dry)).toEqual(answers.map((answer) => answer.real));
    expect(answers.map((answer) => answer.dry)).toEqual([true, true, true, true]);
  });
});
