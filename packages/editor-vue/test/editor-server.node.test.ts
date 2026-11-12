import { contentSchema } from '@numior/content';
import { fromHTML, toJSON } from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';

describe('NuiEditor in Node without a DOM', () => {
  it('renders a document with the toolbar', async () => {
    const document = toJSON(
      fromHTML(contentSchema, '<h2>Кресло «Осло»</h2><p>Чехол снимается</p>'),
    );

    const html = await EditorDriver.ssr({ document, toolbar: 'both' });

    expect(html).toContain('nui-editor-toolbar');
    expect(html).toContain('Кресло «Осло»');
  });
});
