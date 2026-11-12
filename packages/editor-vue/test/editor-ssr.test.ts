import { contentSchema } from '@numior/content';
import { createDoc, toHTML, toJSON, type Doc, type ElementNode } from '@numior/editor-core';
import { generateDoc } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';

const element = (
  type: string,
  id: string,
  content: readonly (ElementNode | string)[] = [],
  attrs: Readonly<Record<string, string | number | null>> = {},
): ElementNode =>
  contentSchema.element(type, {
    id,
    attrs,
    content: content.map((child) =>
      typeof child === 'string' ? contentSchema.text(child) : child,
    ),
  });

const everything = (): Doc => {
  const generated = generateDoc(contentSchema, { blocks: 120, seed: 5 });

  return createDoc(
    contentSchema,
    contentSchema.element('doc', {
      id: generated.root.id,
      content: [
        ...generated.root.content,
        element('paragraph', 'inline', [
          element('image', 'picture', [], {
            src: 'https://cdn.test/a.png',
            alt: 'A',
            caption: 'Cap',
            width: 0.4,
            align: 'start',
            wrap: 'wrap',
          }),
          'Text by ',
          element('mention', 'who', [], { user: 'u1', label: 'Ann' }),
          ' with ',
          element('file', 'chip', [], { url: '/r.pdf', name: 'r.pdf', size: 2048, type: '' }),
        ]),
        element('bookmark', 'mark', [], {
          url: 'https://numior.test/a',
          title: 'A',
          site: 'numior.test',
        }),
        element('embed', 'video', [], { url: 'https://youtu.be/x', provider: 'youtube' }),
      ],
    }),
  );
};

const MARKERS = [
  'nui-editor__static',
  'nui-content__image--wrap-wrap',
  '<span class="nui-content__mention" data-user="u1">@Ann</span>',
  '<span class="nui-content__file-name">r.pdf</span>',
  'nui-content__bookmark',
  'nui-content__table',
];

describe('NuiEditor on the server', () => {
  it('renders a document with every kind of block from JSON and hydrates it without warnings', async () => {
    const document = toJSON(everything());
    const html = await EditorDriver.ssr({ document });

    for (const marker of MARKERS) {
      expect(html).toContain(marker);
    }

    expect(await EditorDriver.ssr({ document })).toBe(html);
    expect(await EditorDriver.hydrate({ document })).toEqual([]);
  });

  it('renders the same document from an HTML model and hydrates it without warnings', async () => {
    const modelValue = toHTML(everything());
    const html = await EditorDriver.ssr({ modelValue });

    for (const marker of MARKERS) {
      expect(html).toContain(marker);
    }

    expect(await EditorDriver.hydrate({ modelValue })).toEqual([]);
  });

  it('renders with the toolbar on the server and hydrates it without warnings', async () => {
    const document = toJSON(everything());

    const html = await EditorDriver.ssr({ document, toolbar: 'both' });

    expect(html).toContain('nui-editor-toolbar');
    expect(await EditorDriver.hydrate({ document, toolbar: 'both' })).toEqual([]);
  });
});
