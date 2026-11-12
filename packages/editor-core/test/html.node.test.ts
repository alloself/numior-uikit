import { describe, expect, it } from 'vite-plus/test';
import {
  createDoc,
  createHTMLWriter,
  createSchema,
  createState,
  fromHTML,
  tableGrid,
  toHTML,
  type Doc,
  type ElementNode,
  type HtmlTableGrid,
} from '../src';
import { fixtureSchema, generateDoc } from '../src/fixtures';
import { buildWith } from './support/notes';
import { outlineOf } from './support/outline';

const { doc, node, text } = buildWith(fixtureSchema);

const read = (html: string, whitespace?: 'collapse' | 'preserve'): string =>
  outlineOf(fromHTML(fixtureSchema, html, { whitespace }).root);

const docOf = (...blocks: readonly ElementNode[]): Doc => createDoc(fixtureSchema, doc(...blocks));

const gridOf = (html: string): HtmlTableGrid | undefined => {
  let grid: HtmlTableGrid | undefined;

  const probe = createSchema({
    nodes: {
      doc: { content: 'block*' },
      probe: {
        group: 'block',
        parse: [
          {
            tag: 'table',
            attrs: (table) => {
              grid = tableGrid(table);
              return {};
            },
          },
        ],
      },
      text: { group: 'inline', inline: true },
    },
  });

  fromHTML(probe, html);
  return grid;
};

const wordItem = (level: number, marker: string, label: string): string =>
  `<p class=MsoListParagraph style='text-indent:-18.0pt;mso-list:l0 level${level} lfo1'>` +
  `<![if !supportLists]><span lang=EN-US><span style='mso-list:Ignore'>${marker}` +
  `<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>` +
  `<span lang=EN-US>${label}</span></p>`;

const wordList = (...items: readonly (readonly [number, string, string])[]): string =>
  items.map(([level, marker, label]) => wordItem(level, marker, label)).join('\n');

describe('HTML parsing', () => {
  it('wraps loose text into paragraphs and reads marks from tags', () => {
    expect(read('Hello <b>bold</b>, <i>it</i> and <a href="/x">link</a><p>Next</p>')).toBe(
      'paragraph("Hello " bold:"bold" ", " italic:"it" " and " link:"link") paragraph("Next")',
    );
  });

  it('collapses whitespace like a browser, keeps it in pre and drops trailing breaks', () => {
    expect(
      read('<p>  a \n  b  </p><pre>\n  x\n  y</pre><p>c<br></p><p><br></p><p>d<br>e</p>'),
    ).toBe(
      'paragraph("a b") code_block("  x\\n  y") paragraph("c") paragraph() paragraph("d" hard_break "e")',
    );

    expect(read('<p> a  b </p>', 'preserve')).toBe('paragraph(" a  b ")');
    expect(read('<pre>a<br>b</pre>')).toBe('code_block("a\\nb")');
  });

  it('builds nested lists and closes the items HTML leaves open', () => {
    expect(read('<ul><li>one<li>two<ul><li>deep</ul></ul><ol start=3><li><p>three</ol>')).toBe(
      'bullet_list(list_item(paragraph("one")) list_item(paragraph("two") bullet_list(list_item(paragraph("deep"))))) ' +
        'ordered_list{start=3}(list_item(paragraph("three")))',
    );
  });

  it('reads a whole table through its rule and spreads merged cells over the grid', () => {
    expect(
      read(
        '<p>before<table><tr><th>H<td colspan=2>V<tr><td>a<td rowspan=2>b<td>c<tr><td>d<td>e</table><table></table>',
      ),
    ).toBe(
      'paragraph("before") table(table_head(table_column{key=c0,name=H}() ' +
        'table_column{key=c1,name=V}() table_column{key=c2}()) ' +
        'table_body(table_row(table_cell{column=c0,value=a} table_cell{column=c1,value=b} ' +
        'table_cell{column=c2,value=c}) ' +
        'table_row(table_cell{column=c0,value=d} table_cell{column=c1} ' +
        'table_cell{column=c2,value=e})))',
    );
  });

  it('lays table sections out as a padded grid and counts the head rows', () => {
    const grid = gridOf(
      '<table><thead><tr><th>A<th>B</thead><tbody><tr><td colspan=3>wide<tr><td>  a  b </td></tbody></table>',
    );

    expect(grid?.head).toBe(1);

    expect(grid?.rows.map((row) => row.map((cell) => cell.text))).toEqual([
      ['A', 'B', ''],
      ['wide', '', ''],
      ['a b', '', ''],
    ]);

    expect(grid?.rows[0]?.[0]?.header).toBe(true);
  });

  it('wraps stray items in their containers and fills required content', () => {
    expect(read('<li>orphan</li><blockquote></blockquote>')).toBe(
      'bullet_list(list_item(paragraph("orphan"))) blockquote(paragraph())',
    );
  });

  it('moves blocks out of textblocks and lists that cannot hold them', () => {
    expect(read('<p>a<img src="x.png">b</p><ul><li>item<h2>Title</h2>tail</li></ul>')).toBe(
      'paragraph("a") image paragraph("b") bullet_list(list_item(paragraph("item"))) heading{level=2}("Title") paragraph("tail")',
    );
  });

  it('skips scripts, styles, comments and refused attributes and keeps unknown wrappers transparent', () => {
    expect(
      read(
        '<!--x--><style>p{}</style><script>alert(1)</script><div><span>keep</span></div><o:p>&amp;&nbsp;&#x41;&unknown; &lt; <</o:p><a>bare</a><img>',
      ),
    ).toBe('paragraph("keep") paragraph("& A&unknown; < <" "bare")'.replace('" "', ''));
  });

  it('ends a comment that closes at once, as a browser does', () => {
    expect(read('<!-->one<p>two</p><!--->three<!-- four -->')).toBe(
      'paragraph("one") paragraph("two") paragraph("three")',
    );
  });

  it('reads numeric references of the Windows range as the characters a browser shows', () => {
    expect(read('<p>1995&#150;2005 &#128;5 &#x99; &#147;q&#148;</p>')).toBe(
      'paragraph("1995–2005 €5 ™ “q”")',
    );
  });

  it('keeps a reference without a semicolon inside an attribute value when a name or = follows', () => {
    const link = fromHTML(fixtureSchema, `<a href="/a?lt=1&lt=2&ampx=3&amp;y=4&#38;z&gt">q</a>`)
      .root.content[0];

    expect(link?.kind === 'element' ? link.content[0] : undefined).toEqual(
      text('q', [fixtureSchema.mark('link', { href: '/a?lt=1&lt=2&ampx=3&y=4&z>' })]),
    );
  });

  it('keeps a numbered list from Word numbered on every level', () => {
    expect(
      read(
        wordList([1, '1.', 'One'], [2, '1.1.', 'Deep'], [2, '1.2.', 'Deeper'], [1, '2.', 'Two']),
      ),
    ).toBe(
      'ordered_list(list_item(paragraph("One") ordered_list(list_item(paragraph("Deep")) list_item(paragraph("Deeper")))) ' +
        'list_item(paragraph("Two")))',
    );

    expect(read(wordList([1, '1', 'One'], [2, '1.1', 'Deep'], [3, '1.1.1', 'Deepest']))).toBe(
      'ordered_list(list_item(paragraph("One") ordered_list(list_item(paragraph("Deep") ' +
        'ordered_list(list_item(paragraph("Deepest")))))))',
    );
  });

  it('starts a list from Word at the number its first item shows', () => {
    expect(read(wordList([1, '2.', 'Two'], [2, '2.3.', 'Third'], [2, '2.4.', 'Fourth']))).toBe(
      'ordered_list{start=2}(list_item(paragraph("Two") ' +
        'ordered_list{start=3}(list_item(paragraph("Third")) list_item(paragraph("Fourth")))))',
    );

    expect(read(wordList([1, '(4)', 'Four'], [2, 'c)', 'Third'], [3, 'iv.', 'Fourth']))).toBe(
      'ordered_list{start=4}(list_item(paragraph("Four") ordered_list{start=3}(list_item(paragraph("Third") ' +
        'ordered_list{start=4}(list_item(paragraph("Fourth")))))))',
    );

    expect(read(wordList([1, 'bb.', 'Twenty-eighth'], [1, 'cc.', 'Next']))).toBe(
      'ordered_list{start=28}(list_item(paragraph("Twenty-eighth")) list_item(paragraph("Next")))',
    );
  });

  it('keeps bullets from Word as bullets whatever glyph draws them', () => {
    expect(
      read(wordList([1, '·', 'Dot'], [2, 'o', 'Circle'], [3, '§', 'Square'], [1, 'v', 'Diamond'])),
    ).toBe(
      'bullet_list(list_item(paragraph("Dot") bullet_list(list_item(paragraph("Circle") ' +
        'bullet_list(list_item(paragraph("Square")))))) list_item(paragraph("Diamond")))',
    );
  });

  it('nests a list that follows an item and keeps spaces the markup asks to keep', () => {
    expect(
      read(
        '<ul><li>a</li> <ul><li>b</li></ul></ul><p><span style="white-space:pre-wrap">x  y</span> z  w</p>',
      ),
    ).toBe(
      'bullet_list(list_item(paragraph("a") bullet_list(list_item(paragraph("b"))))) paragraph("x  y z w")',
    );
  });

  it('reads blank input as one empty block and survives deep nesting', () => {
    expect(read('  \n ')).toBe('paragraph()');
    expect(read(`${'<div>'.repeat(5000)}x${'</div>'.repeat(5000)}`)).toBe('paragraph("x")');
  });

  it('reads attribute values in every quoting style with entities', () => {
    expect(
      outlineOf(
        fromHTML(
          fixtureSchema,
          `<a href='/a?b=1&amp;c=2'>q</a> <a href=/u>u</a> <a href="/v" HREF="/w">v</a>`,
        ).root,
      ),
    ).toBe('paragraph(link:"q" " " link:"u" " " link:"v")');

    const links = fromHTML(fixtureSchema, `<a href='/a?b=1&amp;c=2'>q</a>`).root.content[0];

    expect(links?.kind === 'element' ? links.content[0] : undefined).toEqual(
      text('q', [fixtureSchema.mark('link', { href: '/a?b=1&c=2' })]),
    );
  });
});

describe('HTML serialization', () => {
  it('renders blocks through the schema and escapes text and attributes', () => {
    const page = docOf(
      node('heading', ['<T> & "q"'], { level: 2 }),
      node('paragraph', [
        text('x', [fixtureSchema.mark('link', { href: '/a?b="1"' })]),
        node('hard_break'),
      ]),
      node('paragraph'),
    );

    expect(toHTML(page)).toBe(
      '<h2>&lt;T&gt; &amp; &quot;q&quot;</h2><p><a href="/a?b=&quot;1&quot;">x</a><br><br></p><p><br></p>',
    );
  });

  it('reads its own markup back into the same document', () => {
    const page = docOf(
      node('heading', ['Title'], { level: 3 }),
      node('paragraph', ['a  b ', text('bold', [fixtureSchema.mark('bold')]), node('hard_break')]),
      node('bullet_list', [
        node('list_item', [
          node('paragraph', ['one']),
          node('ordered_list', [node('list_item', [node('paragraph', ['two'])])], { start: 4 }),
        ]),
      ]),
      node('code_block', ['let x\n  y']),
      node('divider'),
      node('table', [
        node('table_head', [
          node('table_column', [node('table_option', [], { label: 'x' })], { key: 'n', name: 'N' }),
        ]),
        node('table_body', [
          node('table_row', [node('table_cell', [], { column: 'n', value: 'c' })]),
        ]),
      ]),
    );

    expect(toHTML(fromHTML(fixtureSchema, toHTML(page), { whitespace: 'preserve' }))).toBe(
      toHTML(page),
    );
  });

  it('writes the same markup from cached blocks and renders only the blocks an edit replaced', () => {
    const write = createHTMLWriter();
    const before = createState({ doc: generateDoc(fixtureSchema, { blocks: 300, seed: 7 }) });

    expect(write(before.doc)).toBe(toHTML(before.doc));

    const after = before.apply(before.tr.insertText('!', 2));

    expect(after.doc.root.content.slice(1)).toEqual(before.doc.root.content.slice(1));
    expect(after.doc.root.content[9]).toBe(before.doc.root.content[9]);
    expect(write(after.doc)).toBe(toHTML(after.doc));
  });
});
