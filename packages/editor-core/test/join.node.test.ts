import { afterEach, describe, expect, it } from 'vite-plus/test';
import { definePlugin, textSelection, type ElementNode } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

type Key = 'Backspace' | 'Delete';

interface Edge {
  readonly name: string;
  readonly blocks: readonly ElementNode[];
  readonly line: string;
  readonly key: Key;
}

const { doc, node } = buildWith(fixtureSchema);

const p = (text = ''): ElementNode => node('paragraph', text === '' ? [] : [text]);

const li = (...content: readonly ElementNode[]): ElementNode => node('list_item', content);

const bullets = (...items: readonly ElementNode[]): ElementNode => node('bullet_list', items);

const columns = (...texts: readonly string[]): ElementNode =>
  node(
    'columns',
    texts.map((text) => node('column', [p(text)])),
  );

const CONTAINERS = {
  bullets: () => bullets(li(p('one')), li(p('two'))),
  numbers: () => node('ordered_list', [li(p('one')), li(p('two'))]),
  todos: () => node('todo_list', [node('todo_item', [p('one')]), node('todo_item', [p('two')])]),
  nested: () => bullets(li(p('one'), bullets(li(p('two'))))),
  quote: () => node('blockquote', [p('one'), p('two')]),
  callout: () => node('callout', [p('one'), p('two')]),
  toggle: () => node('toggle', [p('one'), p('two')]),
  columns: () => columns('one', 'two'),
};

const edgesOf = (name: string, make: () => ElementNode): Edge[] => [
  { name: `Backspace after ${name}`, blocks: [make(), p('next')], line: 'next', key: 'Backspace' },
  { name: `Delete before ${name}`, blocks: [p('prev'), make()], line: 'prev', key: 'Delete' },
  { name: `Delete at the end of ${name}`, blocks: [make(), p('next')], line: 'two', key: 'Delete' },
  { name: `Delete inside ${name}`, blocks: [make(), p('next')], line: 'one', key: 'Delete' },
  {
    name: `Backspace at the start of ${name}`,
    blocks: [p('prev'), make()],
    line: 'one',
    key: 'Backspace',
  },
  { name: `Backspace inside ${name}`, blocks: [make(), p('next')], line: 'two', key: 'Backspace' },
];

const EDGES: readonly Edge[] = Object.entries(CONTAINERS).flatMap(([name, make]) =>
  edgesOf(name, make),
);

let harness: EditingHarness | undefined;

const started = (...args: Parameters<typeof EditingHarness.of>): EditingHarness => {
  harness = EditingHarness.of(...args);
  return harness;
};

const pressed = (key: Key, line: string, ...blocks: readonly ElementNode[]): EditingHarness => {
  const editor = started(doc(...blocks), textSelection(1));

  editor.placeIn(line, key === 'Backspace' ? 0 : line.length);

  if (key === 'Backspace') {
    editor.backspace();
  } else {
    editor.deleteForward();
  }
  return editor;
};

const after = (key: Key, line: string, ...blocks: readonly ElementNode[]): string =>
  pressed(key, line, ...blocks).outline;

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('joining lines across containers', () => {
  it('joins the line after a container to the last line inside it', () => {
    expect(after('Backspace', 'next', CONTAINERS.bullets(), p('next'))).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("twonext")))',
    );

    expect(after('Backspace', 'next', CONTAINERS.nested(), p('next'))).toBe(
      'bullet_list(list_item(paragraph("one") bullet_list(list_item(paragraph("twonext")))))',
    );

    expect(after('Backspace', 'next', CONTAINERS.quote(), p('next'))).toBe(
      'blockquote(paragraph("one") paragraph("twonext"))',
    );

    expect(after('Backspace', 'next', CONTAINERS.toggle(), p('next'))).toBe(
      'toggle(paragraph("one") paragraph("twonext"))',
    );

    expect(after('Backspace', 'next', CONTAINERS.columns(), p('next'))).toBe(
      'columns(column(paragraph("one")) column(paragraph("twonext")))',
    );
  });

  it('puts the cursor where the two lines met', () => {
    const editor = pressed('Backspace', 'next', CONTAINERS.quote(), p('next'));

    editor.type('|');

    expect(editor.outline).toBe('blockquote(paragraph("one") paragraph("two|next"))');
  });

  it('pulls the first line of the container below into the line above and drops what that leaves empty', () => {
    expect(after('Delete', 'prev', p('prev'), CONTAINERS.bullets())).toBe(
      'paragraph("prevone") bullet_list(list_item(paragraph("two")))',
    );

    expect(after('Delete', 'prev', p('prev'), bullets(li(p('one'))))).toBe('paragraph("prevone")');

    expect(after('Delete', 'prev', p('prev'), CONTAINERS.nested())).toBe(
      'paragraph("prevone") bullet_list(list_item(paragraph("two")))',
    );

    expect(after('Delete', 'prev', p('prev'), CONTAINERS.toggle())).toBe(
      'paragraph("prevone") toggle(paragraph("two"))',
    );
  });

  it('joins the last line of a container with the line after it and an item with the next one', () => {
    expect(after('Delete', 'two', CONTAINERS.bullets(), p('next'))).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("twonext")))',
    );

    expect(after('Delete', 'one', CONTAINERS.bullets(), p('next'))).toBe(
      'bullet_list(list_item(paragraph("onetwo"))) paragraph("next")',
    );

    expect(after('Delete', 'one', CONTAINERS.nested(), p('next'))).toBe(
      'bullet_list(list_item(paragraph("onetwo"))) paragraph("next")',
    );
  });

  it('takes columns apart when a join leaves one of two and keeps them while two remain', () => {
    expect(after('Delete', 'prev', p('prev'), CONTAINERS.columns())).toBe(
      'paragraph("prevone") paragraph("two")',
    );

    expect(after('Backspace', 'two', CONTAINERS.columns(), p('next'))).toBe(
      'paragraph("onetwo") paragraph("next")',
    );

    expect(after('Delete', 'prev', p('prev'), columns('one', 'two', 'three'))).toBe(
      'paragraph("prevone") columns(column(paragraph("two")) column(paragraph("three")))',
    );
  });

  it('joins the summary of a toggle to the line above', () => {
    expect(after('Backspace', 'one', p('prev'), CONTAINERS.toggle())).toBe(
      'paragraph("prevone") toggle(paragraph("two"))',
    );
  });

  it('removes an empty line beside a container and leaves the container whole', () => {
    const below = started(doc(p(), CONTAINERS.columns()), textSelection(1));

    expect(below.deleteForward()).toBe(true);
    expect(below.outline).toBe('columns(column(paragraph("one")) column(paragraph("two")))');
    expect(below.selection).toEqual(textSelection(3));

    const above = started(doc(CONTAINERS.quote(), p(), p('z')), textSelection(13));

    expect(above.backspace()).toBe(true);
    expect(above.outline).toBe('blockquote(paragraph("one") paragraph("two")) paragraph("z")');
    expect(above.selection).toEqual(textSelection(10));
  });

  it('selects a divider that ends the container above instead of stepping over it', () => {
    const editor = pressed(
      'Backspace',
      'next',
      node('blockquote', [p('one'), node('divider')]),
      p('next'),
    );

    expect(editor.outline).toBe('blockquote(paragraph("one") divider) paragraph("next")');
    expect(editor.selection.kind).toBe('node');
  });

  it('carries a line into code as plain text', () => {
    const line = node('paragraph', [
      'a',
      node('hard_break'),
      node('mention', [], { user: 'u1', label: 'Ann' }),
    ]);

    const editor = started(
      doc(node('blockquote', [node('code_block', ['let x'])]), line),
      textSelection(1),
    );

    editor.placeIn('a', 0);

    expect(editor.backspace()).toBe(true);
    expect(editor.outline).toBe('blockquote(code_block("let xa\\n@Ann"))');
  });

  it('skips the content a plugin conceals', () => {
    const folded = definePlugin({
      name: 'folded',
      props: { conceals: (parent, index) => parent.type === 'toggle' && index > 0 },
    });

    const below = started(doc(CONTAINERS.toggle(), p('next')), textSelection(1), [folded]);

    below.placeIn('next', 0);

    expect(below.backspace()).toBe(true);
    expect(below.outline).toBe('toggle(paragraph("onenext") paragraph("two"))');

    const inside = started(doc(CONTAINERS.toggle(), p('next')), textSelection(1), [folded]);

    inside.placeIn('one', 3);

    expect(inside.deleteForward()).toBe(true);
    expect(inside.outline).toBe('toggle(paragraph("onenext") paragraph("two"))');
  });

  it('undoes a join across containers in one step', () => {
    const editor = pressed('Delete', 'prev', p('prev'), CONTAINERS.nested());
    const joined = editor.outline;

    editor.press('Mod-z');

    expect(joined).toBe('paragraph("prevone") bullet_list(list_item(paragraph("two")))');

    expect(editor.outline).toBe(
      'paragraph("prev") bullet_list(list_item(paragraph("one") bullet_list(list_item(paragraph("two")))))',
    );
  });

  it.each(EDGES)('does something on $name', ({ blocks, line, key }) => {
    const before = started(doc(...blocks), textSelection(1));

    before.placeIn(line, key === 'Backspace' ? 0 : line.length);

    const start = `${before.outline} ${JSON.stringify(before.selection)}`;
    const editor = pressed(key, line, ...blocks);

    expect(`${editor.outline} ${JSON.stringify(editor.selection)}`).not.toBe(start);
    expect(fixtureSchema.check(editor.state.doc.root)).toEqual({ ok: true });
  });
});
