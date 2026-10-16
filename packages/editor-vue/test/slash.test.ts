import { contentSchema } from '@numior/content';
import { createDoc, toJSON } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;

const mounted = (...args: Parameters<typeof EditorDriver.mount>): EditorDriver => {
  driver = EditorDriver.mount(...args);
  return driver;
};

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const empty = () =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [contentSchema.element('paragraph', { id: 'p' })],
      }),
    ),
  );

const typedSlash = async (): Promise<EditorDriver> => {
  const editor = mounted({ document: empty() });

  editor.focus();
  await editor.select(1);
  await editor.type('/');
  return editor;
};

describe('NuiEditor slash menu', () => {
  it('offers the blocks of the schema after a slash and filters them by the query', async () => {
    const editor = await typedSlash();

    expect(editor.slashShown).toBe(true);

    expect(editor.slashOptions).toEqual([
      'Text',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Bulleted list',
      'Numbered list',
      'To-do list',
      'Quote',
      'Code block',
      'Callout',
      'Toggle',
      'Divider',
      '2 columns',
      '3 columns',
      '4 columns',
      'Table',
    ]);

    await editor.type('h2');

    expect(editor.slashOptions).toEqual(['Heading 2']);

    await editor.type('zz');

    expect(editor.slashShown).toBe(false);
  });

  it('walks options with arrows and turns the block with Enter, dropping the typed query', async () => {
    const editor = await typedSlash();

    await editor.type('head');
    await editor.press('ArrowDown');

    expect(editor.activeOption).toBe('Heading 2');
    expect(editor.attribute('aria-controls')).not.toBeNull();

    await editor.press('Enter');

    expect(editor.markup).toContain(
      '<h2 class="nui-content__heading nui-content__heading--level-2">',
    );

    expect(editor.text).toBe('');
    expect(editor.slashShown).toBe(false);
    expect(editor.attribute('aria-activedescendant')).toBeNull();
  });

  it('closes on Escape and keeps the slash as text', async () => {
    const editor = await typedSlash();

    await editor.press('Escape');

    expect(editor.slashShown).toBe(false);

    await editor.type('x');

    expect(editor.text).toBe('/x');
    expect(editor.slashShown).toBe(false);
  });

  it('chooses an option by pointer', async () => {
    const editor = await typedSlash();

    await editor.type('div');
    await editor.clickSlash('Divider');

    expect(editor.markup).toContain('<hr class="nui-content__divider"');
    expect(editor.text).toBe('');
  });
});
