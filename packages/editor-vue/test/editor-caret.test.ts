import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const withDivider = (): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text('Intro')] }),
          contentSchema.element('divider', { id: 'd' }),
          contentSchema.element('paragraph', { id: 'o', content: [contentSchema.text('Outro')] }),
        ],
      }),
    ),
  );

const types = (document: DocJSON | undefined): readonly string[] =>
  (document?.root.content ?? []).map((block) => ('type' in block ? block.type : 'text'));

describe('NuiEditor caret beside blocks without text', () => {
  it('puts the caret after a divider clicked beside it and opens a line there with Enter', async () => {
    const editor = EditorDriver.mount({ document: withDivider() });

    driver = editor;
    editor.focus();
    await editor.clickBeside('.nui-content__divider');

    expect(editor.classesOf('.nui-content__divider')).toContain('nui-editor__gap');

    await editor.press('Enter');
    await editor.type('after');

    expect(types(editor.documents.at(-1))).toEqual([
      'paragraph',
      'divider',
      'paragraph',
      'paragraph',
    ]);

    expect(editor.blockTexts).toEqual(['p:Intro', 'hr:', 'p:after', 'p:Outro']);
  });
});
