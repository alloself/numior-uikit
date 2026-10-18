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

const withFile = (): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text('Intro')] }),
          contentSchema.element('file', {
            id: 'f',
            attrs: { url: '/notes.txt', name: 'notes.txt', size: 10, type: 'text/plain' },
          }),
          contentSchema.element('divider', { id: 'd' }),
        ],
      }),
    ),
  );

const types = (document: DocJSON | undefined): readonly string[] =>
  (document?.root.content ?? []).map((block) => ('type' in block ? block.type : 'text'));

describe('NuiEditor caret beside blocks without text', () => {
  it('puts the caret after a file clicked beside its card and opens a line there with Enter', async () => {
    const editor = EditorDriver.mount({ document: withFile() });

    driver = editor;
    editor.focus();
    await editor.clickBeside('.nui-content__file');

    expect(editor.classesOf('.nui-content__file')).toContain('nui-editor__gap');

    await editor.press('Enter');
    await editor.type('after');

    expect(types(editor.documents.at(-1))).toEqual(['paragraph', 'file', 'paragraph', 'divider']);
    expect(editor.blockTexts).toEqual(['p:Intro', 'a:', 'p:after', 'hr:']);
  });
});
