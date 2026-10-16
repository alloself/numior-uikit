import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createDoc, createSchema, createState, renderTag, contentHole } from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { EditorViewDriver } from './drivers/view';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith(fixtureSchema);

const bold = fixtureSchema.mark('bold');
const italic = fixtureSchema.mark('italic');
const link = fixtureSchema.mark('link', { href: 'https://numior.test' });

let driver: EditorViewDriver | undefined;

const mounted = (...args: Parameters<typeof EditorViewDriver.mount>): EditorViewDriver => {
  driver = EditorViewDriver.mount(...args);
  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const brokenSchema = (render: () => ReturnType<typeof renderTag>, leaf = false) =>
  createSchema({
    nodes: {
      doc: { content: 'block+' },
      block: leaf ? { group: 'block', render } : { group: 'block', content: 'text*', render },
      text: { inline: true },
    },
  });

const foreignState = () => {
  const other = buildWith(notes);

  return createState({ doc: createDoc(notes, other.doc(other.node('paragraph'))) });
};

describe('editor view', () => {
  it('renders blocks, leaves and marks through the render specs of the schema', () => {
    const view = mounted(
      doc(
        node('heading', ['Title'], { level: 2 }),
        node('paragraph', [
          'plain ',
          text('strong', [bold]),
          text('both', [bold, italic]),
          text('site', [link]),
        ]),
        node('paragraph'),
        node('bullet_list', [node('list_item', [node('paragraph', ['one'])])]),
        node('code_block', ['let x']),
        node('divider'),
        node('image', [], { src: 'a.png', alt: 'A' }),
        node('paragraph', [
          node('mention', [], { user: 'u1', label: 'Ann' }),
          'end',
          node('hard_break'),
        ]),
        node('table', [
          node('table_head', [node('table_column', [], { name: 'H' })]),
          node('table_body', [node('table_row', [node('table_cell', [], { value: 1 })])]),
        ]),
      ),
    );

    expect(view.markup).toBe(
      [
        '<h2>Title</h2>',
        '<p>plain <strong>strong</strong><strong><em>both</em></strong><a href="https://numior.test">site</a></p>',
        '<p><br></p>',
        '<ul><li><p>one</p></li></ul>',
        '<pre><code>let x</code></pre>',
        '<hr contenteditable="false">',
        '<img src="a.png" alt="A" contenteditable="false">',
        '<p><span contenteditable="false">@Ann</span>end<br><br></p>',
        '<table contenteditable="false"><thead><tr><th><span contenteditable="false">H</span><datalist></datalist></th></tr></thead><tbody><tr><td contenteditable="false">1</td></tr></tbody></table>',
      ].join(''),
    );

    expect(view.editable).toBe('true');
    expect(view.role).toBe('textbox');
  });

  it('falls back to div and span when the schema gives no render specs', () => {
    const plain = createSchema({
      nodes: {
        doc: { content: 'block+' },
        block: { group: 'block', content: 'inline*' },
        rule: { group: 'block' },
        text: { group: 'inline', inline: true },
        chip: { group: 'inline', inline: true },
      },
      marks: { strong: {} },
    });

    const build = buildWith(plain);

    const view = mounted(
      build.doc(
        build.node('block', [build.text('a', [plain.mark('strong')]), build.node('chip')]),
        build.node('rule'),
      ),
      plain,
    );

    expect(view.markup).toBe(
      '<div><span>a</span><span contenteditable="false"></span></div><div contenteditable="false"></div>',
    );
  });

  it('groups top-level blocks into chunks that skip rendering off screen together', () => {
    const paragraphs = Array.from({ length: 70 }, (_, index) => node('paragraph', [`p${index}`]));
    const view = mounted(doc(...paragraphs));

    expect(view.chunkSizes).toEqual([32, 32, 6]);
    expect(view.chunkStyle(0)).toEqual({ visibility: 'auto', intrinsicSize: 'auto 768px' });
    expect(view.blocks).toHaveLength(70);

    view.change((tr) =>
      tr.insert(
        view.positionOf(paragraphs[1]?.id ?? ''),
        Array.from({ length: 40 }, () => fixtureSchema.element('paragraph', { id: tr.newId() })),
      ),
    );

    expect(view.chunkSizes).toEqual([32, 32, 8, 32, 6]);

    expect(view.roundTrip(view.positionOf(paragraphs[60]?.id ?? '') + 1)).toBe(
      view.positionOf(paragraphs[60]?.id ?? '') + 1,
    );

    view.change((tr) => tr.delete(0, view.positionOf(paragraphs[40]?.id ?? '')));

    expect(view.chunkSizes.reduce((sum, size) => sum + size, 0)).toBe(30);
    expect(view.chunkSizes.every((size) => size > 0)).toBe(true);
  });

  it('types into the same text node and leaves every other block alone', () => {
    const middle = node('paragraph', ['two']);
    const view = mounted(doc(node('paragraph', ['one']), middle, node('paragraph', ['three'])));

    view.remember();
    view.change((tr) => tr.insertText('!', view.positionOf(middle.id) + 4));

    expect(view.texts).toEqual(['one', 'two!', 'three']);
    expect(view.keptBlocks).toEqual([true, true, true]);
    expect(view.keptTexts).toEqual([true, true, true]);
    expect(view.rootChanges).toBe(0);
  });

  it('adds only the new block when a paragraph splits and moves kept blocks by id', () => {
    const first = node('paragraph', ['one']);
    const middle = node('paragraph', ['two']);
    const view = mounted(doc(first, middle, node('paragraph', ['three'])));

    view.remember();
    view.change((tr) => tr.split(view.positionOf(middle.id) + 2));

    expect(view.texts).toEqual(['one', 't', 'wo', 'three']);
    expect(view.keptBlocks).toEqual([true, true, false, true]);
    expect(view.rootChanges).toBe(1);

    view.remember();
    view.change((tr) => tr.delete(0, first.size).insert(view.docSize - first.size, [first]));

    expect(view.texts).toEqual(['t', 'wo', 'three', 'one']);
    expect(view.keptBlocks).toEqual([true, true, true, true]);
    expect(view.rootChanges).toBe(2);
  });

  it('renders a block again when its attributes change and finds nodes by id', () => {
    const heading = node('heading', ['Title'], { level: 1 });
    const view = mounted(doc(heading, node('paragraph', ['text'])));

    view.remember();
    view.change((tr) => tr.setNodeAttrs(view.positionOf(heading.id), { level: 2 }));

    expect(view.keptBlocks).toEqual([false, true]);
    expect(view.nodeTag(heading.id)).toBe('h2');
    expect(view.nodeTag('missing')).toBeUndefined();
  });

  it('keeps a placeholder break in empty text blocks and after a trailing hard break', () => {
    const empty = node('paragraph');
    const view = mounted(doc(empty));

    expect(view.markup).toBe('<p><br></p>');
    view.change((tr) => tr.insertText('a', 1));
    expect(view.markup).toBe('<p>a</p>');
    view.change((tr) => tr.insert(2, [node('hard_break')]));
    expect(view.markup).toBe('<p>a<br><br></p>');
    view.change((tr) => tr.delete(1, 3));
    expect(view.markup).toBe('<p><br></p>');
  });

  it('maps every position of a generated document to the DOM and back', () => {
    const generated = generateDoc(fixtureSchema, { blocks: 40, seed: 3 });
    const view = mounted(generated.root);
    const positions = Array.from({ length: view.docSize + 1 }, (_, pos) => pos);

    expect(positions.map((pos) => view.roundTrip(pos))).toEqual(positions);
  });

  it('reads positions from points inside marks, leaves, static parts and placeholders', () => {
    const view = mounted(
      doc(
        node('paragraph', [text('bold', [bold]), node('mention', [], { user: 'u', label: 'Ann' })]),
        node('code_block', ['code']),
        node('todo_list', [node('todo_item', [node('paragraph', ['task'])])]),
        node('paragraph'),
      ),
    );

    expect(view.positionAt('strong', 0)).toBe(1);
    expect(view.positionAt('strong', 1)).toBe(5);
    expect(view.positionInText('@Ann', 2)).toBe(6);
    expect(view.positionInText('@Ann', 0)).toBe(5);
    expect(view.positionAt('pre', 0)).toBe(8);
    expect(view.positionAt('pre', 1)).toBe(12);
    expect(view.positionAt('input', 0)).toBe(15);
    expect(view.positionAt('li', 0)).toBe(15);
    expect(view.positionAt('p', 0, 2)).toBe(24);
    expect(view.positionAt('p', 1, 2)).toBe(24);
    expect(() => view.positionOutside()).toThrow(RangeError);
  });

  it('refuses render specs that misplace the content hole', () => {
    const block = buildWith(brokenSchema(() => renderTag('div')));
    const root = block.doc(block.node('block', ['a']));
    const leaf = buildWith(brokenSchema(() => renderTag('hr'), true));
    const leafRoot = leaf.doc(leaf.node('block'));

    expect(() =>
      EditorViewDriver.mount(
        root,
        brokenSchema(() => renderTag('div', {}, [contentHole, contentHole])),
      ),
    ).toThrow(RangeError);

    expect(() =>
      EditorViewDriver.mount(
        root,
        brokenSchema(() => renderTag('div', {}, [renderTag('b'), 'x'])),
      ),
    ).toThrow(RangeError);

    expect(() =>
      EditorViewDriver.mount(
        root,
        brokenSchema(() => renderTag('div', {}, ['x', contentHole])),
      ),
    ).toThrow(RangeError);

    expect(() =>
      EditorViewDriver.mount(
        root,
        brokenSchema(() => renderTag('div', {}, ['x', renderTag('p', {}, [contentHole])])),
      ),
    ).toThrow(RangeError);

    expect(() =>
      EditorViewDriver.mount(
        leafRoot,
        brokenSchema(() => renderTag('hr', {}, [contentHole]), true),
      ),
    ).toThrow(RangeError);

    expect(() =>
      EditorViewDriver.mount(
        root,
        brokenSchema(() =>
          renderTag('div', {}, [renderTag('i', {}, ['x']), renderTag('p', {}, [contentHole])]),
        ),
      ),
    ).not.toThrow();
  });

  it('switches editing off, refuses another schema and leaves the host clean', () => {
    const view = mounted(doc(node('paragraph', ['a'])));

    view.setEditable(false);
    expect(view.editable).toBe('false');
    expect(() => view.receive(foreignState())).toThrow(RangeError);

    view.destroy();
    expect(view.markup).toBe('');
    expect(view.editable).toBeNull();
    expect(view.role).toBeNull();
  });
});
