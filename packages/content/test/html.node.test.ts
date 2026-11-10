import { fromHTML, toHTML, toJSON } from '@numior/editor-core';
import { generateDoc } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { contentSchema } from '../src';
import { docOf, everyBlock, node } from './support/documents';

const blocksOf = (html: string): readonly unknown[] =>
  toJSON(fromHTML(contentSchema, html)).root.content?.map((block) => stripIds(block)) ?? [];

const stripIds = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripIds);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).reduce<[string, unknown][]>((kept, [key, inner]) => {
      if (key !== 'id') {
        kept.push([key, stripIds(inner)]);
      }
      return kept;
    }, []),
  );
};

const paragraph = (...content: readonly unknown[]) => ({ type: 'paragraph', content });

describe('content HTML', () => {
  it('reads its own markup of every block and mark back into the same document', () => {
    const page = everyBlock();

    expect(toHTML(fromHTML(contentSchema, toHTML(page), { whitespace: 'preserve' }))).toBe(
      toHTML(page),
    );
  });

  it('keeps the caption of an image set in the line through its markup', () => {
    const page = docOf(
      node('paragraph', [
        'See ',
        node('image', [], { src: 'a.png', alt: 'A', caption: 'Hidden for now', wrap: 'inline' }),
      ]),
    );

    const markup = toHTML(page);

    expect(markup).not.toContain('nui-content__caption');

    expect(blocksOf(markup)).toEqual([
      paragraph(
        { text: 'See ' },
        {
          type: 'image',
          attrs: {
            src: 'a.png',
            alt: 'A',
            caption: 'Hidden for now',
            width: null,
            align: 'center',
            wrap: 'inline',
          },
        },
      ),
    ]);
  });

  it('reads generated documents back from their markup', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const page = generateDoc(contentSchema, { blocks: 400, seed });
      const markup = toHTML(page);

      expect(toHTML(fromHTML(contentSchema, markup, { whitespace: 'preserve' }))).toBe(markup);
    }
  });

  it('reads styled spans and keeps the Google Docs wrapper from bolding everything', () => {
    expect(
      blocksOf(
        '<b style="font-weight:normal;" id="docs-internal-guid-1"><p><span style="font-weight:700">B</span><span style="font-style:italic">I</span><span style="text-decoration:underline line-through">US</span><span style="font-weight:400">n</span></p></b>',
      ),
    ).toEqual([
      paragraph(
        { text: 'B', marks: [{ type: 'bold' }] },
        { text: 'I', marks: [{ type: 'italic' }] },
        { text: 'US', marks: [{ type: 'underline' }, { type: 'strike' }] },
        { text: 'n' },
      ),
    ]);
  });

  it('reads task lists, details, figures, deep headings and code languages from other sites', () => {
    expect(
      blocksOf(
        '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked disabled> done</li><li><input type="checkbox"> open</li></ul>' +
          '<details open><summary>More</summary><p>Body</p></details>' +
          '<figure style="width: 50%"><img src="/a.png" alt="A" width="320"><figcaption> Cap </figcaption></figure>' +
          '<h5>Deep</h5><pre><code class="language-ts">let x</code></pre><mark>hi</mark>',
      ),
    ).toEqual([
      {
        type: 'todo_list',
        content: [
          { type: 'todo_item', attrs: { checked: true }, content: [paragraph({ text: 'done' })] },
          { type: 'todo_item', attrs: { checked: false }, content: [paragraph({ text: 'open' })] },
        ],
      },
      {
        type: 'toggle',
        attrs: { open: true },
        content: [paragraph({ text: 'More' }), paragraph({ text: 'Body' })],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'image',
            attrs: {
              src: '/a.png',
              alt: 'A',
              caption: 'Cap',
              width: 0.5,
              align: 'center',
              wrap: 'break',
            },
          },
        ],
      },
      { type: 'heading', attrs: { level: 3 }, content: [{ text: 'Deep' }] },
      { type: 'code_block', attrs: { language: 'ts' }, content: [{ text: 'let x' }] },
      paragraph({ text: 'hi', marks: [{ type: 'highlight', attrs: { name: 'yellow' } }] }),
    ]);
  });

  it('drops pasted links whose scheme is split by an encoded tab', () => {
    expect(
      blocksOf(
        '<p><a href="java&#9;script:alert(1)">x</a><a class="nui-content__file" href="java&#9;script:alert(1)" download="a.pdf">a.pdf</a></p>',
      ),
    ).toEqual([paragraph({ text: 'xa.pdf' })]);
  });

  it('drops script links, foreign image sources and unknown presets', () => {
    expect(
      blocksOf(
        '<p><a href="javascript:alert(1)">x</a><span class="nui-content__colour--neon">y</span></p><img src="javascript:alert(1)"><pre class="language-a&lt;b"><code>c</code></pre>',
      ),
    ).toEqual([
      paragraph({ text: 'xy' }),
      { type: 'code_block', attrs: { language: null }, content: [{ text: 'c' }] },
    ]);
  });
});
