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

const titled = () =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('heading', {
            id: 'h',
            attrs: { level: 2 },
            content: [contentSchema.text('Title')],
          }),
        ],
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
      'Heading 4',
      'Heading 5',
      'Heading 6',
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
      'Image',
      'File',
      'Bookmark',
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

  it('inserts from the toolbar the same blocks the slash menu offers', async () => {
    const editor = await typedSlash();

    const slash = editor.slashOptions;

    await editor.openMenu('insert');

    expect(editor.insertOptions).toEqual(slash);
    expect(slash).toEqual(expect.arrayContaining(['Callout', 'Table', 'Image', 'File']));

    await editor.press('Escape');
    await editor.press('Backspace');
    await editor.chooseInsert('Callout');

    expect(editor.markup).toContain('nui-content__callout');
  });

  it('inserts a block from the toolbar below the block under the caret, whatever that block is', async () => {
    const editor = mounted({ document: titled() });

    editor.focus();
    await editor.select(3);
    await editor.openMenu('insert');

    expect(editor.insertShown).toBe(true);
    expect(editor.insertSearchFocused).toBe(true);
    expect(editor.insertUnavailable).toEqual([]);

    await editor.chooseInsert('Bulleted list');

    expect(editor.markup).toContain(
      '<h2 class="nui-content__heading nui-content__heading--level-2">Title</h2><ul class="nui-content__list nui-content__list--bullet">',
    );

    expect(editor.insertShown).toBe(false);
    expect(editor.focused).toBe(true);

    await editor.type('x');
    await editor.chooseInsert('Heading 4');

    expect(editor.markup).toContain(
      '</ul><h4 class="nui-content__heading nui-content__heading--level-4">',
    );
  });

  it('finds a block of the toolbar menu by a part of its name or by a keyword', async () => {
    const editor = mounted({ document: titled() });

    editor.focus();
    await editor.select(3);
    await editor.searchInsert('quo');

    expect(editor.insertOptions).toEqual(['Quote']);

    await editor.searchInsert('h5');

    expect(editor.insertOptions).toEqual(['Heading 5']);

    await editor.searchInsert('zz');

    expect(editor.insertOptions).toEqual([]);

    await editor.closeInsert();
    await editor.openMenu('insert');

    expect(editor.insertOptions).toContain('Quote');
  });
});
