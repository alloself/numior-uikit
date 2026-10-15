import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type ElementNode } from '@numior/editor-core';
import { afterEach, describe, expect, it } from 'vitest';
import { EditorDriver } from './drivers/editor';

let driver: EditorDriver | undefined;

const mounted = (...args: Parameters<typeof EditorDriver.mount>): EditorDriver => {
  driver = EditorDriver.mount(...args);
  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const paragraph = (id: string, text: string): ElementNode =>
  contentSchema.element('paragraph', {
    id,
    content: text === '' ? [] : [contentSchema.text(text)],
  });

const page = (...blocks: readonly ElementNode[]) =>
  toJSON(createDoc(contentSchema, contentSchema.element('doc', { id: 'root', content: blocks })));

describe('NuiEditor toolbar', () => {
  it('offers the controls of its schema and hides when read-only or turned off', async () => {
    const editor = mounted({ document: page(paragraph('p', 'Hello')) });

    expect(editor.tools).toEqual([
      'Undo',
      'Redo',
      'Block type: Text',
      'Bold',
      'Italic',
      'Underline',
      'Strikethrough',
      'Inline code',
      'Link',
      'Colour',
      'Bulleted list',
      'Numbered list',
      'To-do list',
      'Quote',
      'Divider',
    ]);

    expect(editor.available('Undo')).toBe(false);

    await editor.receive({ readonly: true });

    expect(editor.hasToolbar).toBe(false);

    await editor.receive({ readonly: false, toolbar: 'none' });

    expect(editor.hasToolbar).toBe(false);
  });

  it('formats the selection and shows the marks under the cursor', async () => {
    const editor = mounted({ document: page(paragraph('p', 'Hello world')) });

    await editor.select(1, 6);
    await editor.useTool('Bold');

    expect(editor.markup).toContain('<strong class="nui-content__bold">Hello</strong>');
    expect(editor.pressed('Bold')).toBe(true);

    await editor.select(9);

    expect(editor.pressed('Bold')).toBe(false);

    await editor.select(3);

    expect(editor.pressed('Bold')).toBe(true);
    expect(editor.available('Undo')).toBe(true);

    await editor.useTool('Undo');

    expect(editor.markup).not.toContain('<strong');
    expect(editor.available('Redo')).toBe(true);
  });

  it('changes the block type from its menu and names the current one', async () => {
    const editor = mounted({ document: page(paragraph('p', 'Title')) });

    await editor.select(2);
    await editor.chooseBlock('Heading 2');

    expect(editor.markup).toContain(
      '<h2 class="nui-content__heading nui-content__heading--level-2">Title</h2>',
    );

    expect(editor.blockType).toBe('Heading 2');
    expect(editor.focused).toBe(true);
    expect(editor.available('Bold')).toBe(true);

    await editor.chooseBlock('Code block');

    expect(editor.blockType).toBe('Code block');
    expect(editor.available('Bold')).toBe(false);
  });

  it('toggles lists and quotes and inserts a divider after the block', async () => {
    const editor = mounted({ document: page(paragraph('p', 'Item')) });

    await editor.select(2);
    await editor.useTool('Bulleted list');

    expect(editor.markup).toContain('<ul class="nui-content__list nui-content__list--bullet">');
    expect(editor.pressed('Bulleted list')).toBe(true);

    await editor.useTool('Numbered list');

    expect(editor.markup).toContain('<ol class="nui-content__list nui-content__list--ordered">');
    expect(editor.pressed('Bulleted list')).toBe(false);

    await editor.useTool('Numbered list');

    expect(editor.markup).not.toContain('<ol');

    await editor.useTool('Quote');

    expect(editor.pressed('Quote')).toBe(true);

    await editor.useTool('Quote');

    expect(editor.markup).not.toContain('<blockquote');

    await editor.useTool('Divider');

    expect(editor.markup).toContain('<hr class="nui-content__divider"');
    expect(editor.text).toBe('Item');
  });

  it('takes focus with Alt+F10 on the first usable control, walks with arrows and gives it back on Escape', async () => {
    const editor = mounted({ document: page(paragraph('p', 'Hello')) });

    editor.focus();
    await editor.press('F10', { alt: true });

    expect(editor.toolbarFocus).toBe('Block type: Text');

    await editor.toolbarKey('ArrowRight');
    await editor.toolbarKey('ArrowRight');

    expect(editor.toolbarFocus).toBe('Italic');

    await editor.toolbarKey('Escape');

    expect(editor.focused).toBe(true);
  });
});
