import { fromJSON, toJSON } from '@numior/editor-core';
import { generateDoc } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { contentSchema, renderContent } from '../src';
import { EVERY_BLOCK_MARKUP, docOf, everyBlock, node } from './support/documents';

const stamped = (blocks: readonly unknown[]) => ({
  format: 1,
  schema: { name: 'numior-content', version: 4 },
  root: { id: 'r', type: 'doc', content: blocks },
});

const attrIssues = (blocks: readonly unknown[]) => {
  const read = fromJSON(contentSchema, stamped(blocks));

  return read.ok
    ? []
    : read.issues.map((issue) => (issue.kind === 'attr' ? issue.attr : issue.kind));
};

const linked = (href: string) => ({
  id: href,
  type: 'paragraph',
  content: [{ text: 'x', marks: [{ type: 'link', attrs: { href } }] }],
});

const inLine = (id: string, child: object) => ({
  id: `line ${id}`,
  type: 'paragraph',
  content: [child],
});

const image = (src: string, attrs: object = {}) =>
  inLine(src, { id: `image ${src}`, type: 'image', attrs: { src, ...attrs } });

const file = (url: string, attrs: object = {}) =>
  inLine(url, { id: `file ${url}`, type: 'file', attrs: { url, ...attrs } });

const embed = (url: string, provider: string) => ({
  id: `embed ${url} ${provider}`,
  type: 'embed',
  attrs: { url, provider },
});

const bookmark = (url: string, picture: string) => ({
  id: `bookmark ${url}`,
  type: 'bookmark',
  attrs: { url, image: picture },
});

const PLAIN_LINES: readonly string[] = [
  'Title',
  'plain both@Ann',
  '',
  'one',
  'two',
  'done',
  'let x',
  'Note',
  'Head',
  'Body',
  'Text  around',
  'See Report.pdf now',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://numior.test/blog',
  'L',
  'R',
  'Name\tSum\tPaid\tState',
  'Ann\t12.5\tTRUE\tOpen',
  'hi',
];

describe('content schema', () => {
  it('holds the generated ten-thousand-block mix of the editor fixtures', () => {
    const doc = generateDoc(contentSchema, { blocks: 10_000, seed: 3 });

    expect(contentSchema.check(doc.root)).toEqual({ ok: true });
    expect(fromJSON(contentSchema, toJSON(doc)).ok).toBe(true);
  });

  it('gives the clipboard a plain text with breaks, mentions, files, links and table cells', () => {
    const page = everyBlock();

    expect(page.textBetween(0, page.size).split('\n')).toEqual(PLAIN_LINES);
  });

  it('keeps a table cell on its own line and in its own column whatever its text holds', () => {
    const page = docOf(
      node('table', [
        node('table_head', [node('table_column', [], { name: 'A\tB' }), node('table_column')]),
        node('table_body', [
          node('table_row', [
            node('table_cell', [], { value: 'two\nlines' }),
            node('table_cell', [], { value: false }),
          ]),
          node('table_row', [node('table_cell'), node('table_cell', [], { value: 7 })]),
        ]),
      ]),
    );

    expect(page.textBetween(0, page.size)).toBe('A B\t\ntwo lines\tFALSE\n\t7');
  });

  it('renders every block and mark into classed markup with a break in empty lines', () => {
    expect(renderContent(everyBlock())).toBe(
      `<div class="nui-content nui-content--size-md">${EVERY_BLOCK_MARKUP}</div>`,
    );

    expect(renderContent(docOf(node('paragraph', ['<b> & "q"'])), { size: 'lg' })).toBe(
      '<div class="nui-content nui-content--size-lg"><p class="nui-content__paragraph">&lt;b&gt; &amp; &quot;q&quot;</p></div>',
    );
  });

  it('accepts web, mail and relative links and refuses script and foreign image sources', () => {
    expect(
      attrIssues([
        linked('https://numior.test'),
        linked('mailto:team@numior.test'),
        linked('/docs'),
        linked('#top'),
        image('https://numior.test/a.png'),
        image('data:image/png;base64,AAAA'),
        image('pictures/a.png'),
      ]),
    ).toEqual([]);

    expect(
      attrIssues([
        linked('javascript:alert(1)'),
        linked(' JavaScript:alert(1)'),
        image('data:text/html,<b>'),
        image('javascript:alert(1)'),
        image('blob:https://numior.test/1'),
        image(''),
      ]),
    ).toEqual(['href', 'href', 'src', 'src', 'src', 'src']);
  });

  it('refuses addresses that hide a scheme behind tabs, line breaks or control characters', () => {
    expect(
      attrIssues([
        linked('java\tscript:alert(1)'),
        linked('java\nscript:alert(1)'),
        linked('java\rscript:alert(1)'),
        linked('\u0001javascript:alert(1)'),
        linked('javascript\u007F:alert(1)'),
        image('java\tscript:alert(2)'),
        file('java\tscript:alert(3)'),
      ]),
    ).toEqual(['href', 'href', 'href', 'href', 'href', 'src', 'url']);
  });

  it('keeps files on web or relative links and image widths inside a fifth to the whole line', () => {
    expect(
      attrIssues([
        file('https://numior.test/a.pdf', { name: 'a.pdf', size: 10, type: 'application/pdf' }),
        file('files/a.zip'),
        image('a.png', { width: 0.2, align: 'start' }),
        image('b.png', { width: 1, align: 'end' }),
      ]),
    ).toEqual([]);

    expect(
      attrIssues([
        file('javascript:alert(1)'),
        file('data:application/pdf;base64,AAAA'),
        file('blob:https://numior.test/1'),
        file('a.pdf', { size: -1 }),
        image('a.png', { width: 0.1 }),
        image('b.png', { width: 320 }),
        image('c.png', { align: 'wide' }),
        image('d.png', { wrap: 'float' }),
      ]),
    ).toEqual(['url', 'url', 'url', 'size', 'width', 'width', 'align', 'wrap']);
  });

  it('keeps embeds and bookmarks on web addresses with a plain provider name', () => {
    expect(
      attrIssues([embed('https://youtu.be/x', 'youtube'), bookmark('https://numior.test', '')]),
    ).toEqual([]);

    expect(
      attrIssues([
        embed('javascript:alert(1)', 'youtube'),
        embed('https://youtu.be/x', '"><script>'),
        bookmark('/relative', ''),
        bookmark('https://numior.test', 'data:image/png;base64,AAAA'),
      ]),
    ).toEqual(['url', 'provider', 'url', 'image']);
  });
});
