import { fromJSON, toJSON } from '@numior/editor-core';
import { generateDoc } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { contentSchema, renderContent } from '../src';
import { EVERY_BLOCK_MARKUP, docOf, everyBlock, node } from './support/documents';

const stamped = (blocks: readonly unknown[]) => ({
  format: 1,
  schema: { name: 'numior-content', version: 3 },
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

const image = (src: string, attrs: object = {}) => ({
  id: `image ${src}`,
  type: 'image',
  attrs: { src, ...attrs },
});

const file = (url: string, attrs: object = {}) => ({
  id: `file ${url}`,
  type: 'file',
  attrs: { url, ...attrs },
});

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

describe('content schema', () => {
  it('holds the generated ten-thousand-block mix of the editor fixtures', () => {
    const doc = generateDoc(contentSchema, { blocks: 10_000, seed: 3 });

    expect(contentSchema.check(doc.root)).toEqual({ ok: true });
    expect(fromJSON(contentSchema, toJSON(doc)).ok).toBe(true);
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
      ]),
    ).toEqual(['url', 'url', 'url', 'size', 'width', 'width', 'align']);
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
