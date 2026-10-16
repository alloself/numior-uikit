import { fromJSON, toJSON } from '@numior/editor-core';
import { generateDoc } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { contentSchema, renderContent } from '../src';
import { EVERY_BLOCK_MARKUP, docOf, everyBlock, node } from './support/documents';

const stamped = (blocks: readonly unknown[]) => ({
  format: 1,
  schema: { name: 'numior-content', version: 2 },
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

const image = (src: string) => ({ id: `image ${src}`, type: 'image', attrs: { src } });

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
        image('blob:https://numior.test/1'),
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
        image(''),
      ]),
    ).toEqual(['href', 'href', 'src', 'src', 'src']);
  });
});
