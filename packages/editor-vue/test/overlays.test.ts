import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type ElementNode } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
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

const paragraph = (text: string): ElementNode =>
  contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text(text)] });

const page = (text: string) =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', { id: 'root', content: [paragraph(text)] }),
    ),
  );

describe('NuiEditor links, colours and bubble', () => {
  it('links the selection from Ctrl+K, edits the link under the cursor and removes it', async () => {
    const editor = mounted({ document: page('Hello world') });

    editor.focus();
    await editor.select(1, 6);
    await editor.press('k', { ctrl: true });

    expect(editor.linkShown).toBe(true);
    expect(editor.linkFocused).toBe(true);
    expect(editor.linkDraft).toBe('');

    await editor.submitLink('javascript:alert(1)');

    expect(editor.linkError).toBe('This address cannot be linked');
    expect(editor.linkShown).toBe(true);

    await editor.submitLink('https://numior.test');

    expect(editor.markup).toContain(
      '<a class="nui-content__link" href="https://numior.test">Hello</a>',
    );

    expect(editor.linkShown).toBe(false);
    expect(editor.focused).toBe(true);

    await editor.select(3);

    expect(editor.pressed('Link')).toBe(true);

    await editor.useTool('Link');

    expect(editor.linkDraft).toBe('https://numior.test');

    await editor.removeLink();

    expect(editor.markup).not.toContain('<a ');
  });

  it('inserts the address as linked text at a bare cursor', async () => {
    const editor = mounted({ document: page('See ') });

    editor.focus();
    await editor.select(5);
    await editor.press('k', { ctrl: true });
    await editor.submitLink('/docs');

    expect(editor.markup).toContain('See <a class="nui-content__link" href="/docs">/docs</a>');
  });

  it('colours the selection from the author palette and drops other colours on paste', async () => {
    const editor = mounted({
      document: page('Hello world'),
      colours: ['red', 'blue'],
      highlights: ['yellow'],
    });

    expect(editor.colourOptions).toEqual(['Default', 'Red', 'Blue', 'None', 'Yellow']);

    await editor.select(1, 6);
    await editor.chooseColour(0, 'Red');

    expect(editor.markup).toContain(
      '<span class="nui-content__colour nui-content__colour--red">Hello</span>',
    );

    await editor.chooseColour(1, 'Yellow');

    expect(editor.markup).toContain('nui-content__highlight--yellow');

    await editor.chooseColour(0, 'Default');

    expect(editor.markup).not.toContain('nui-content__colour--red');

    await editor.select(12);

    await editor.pasteHTML(
      '<span class="nui-content__colour--green">green</span><span class="nui-content__colour--blue">blue</span>',
    );

    expect(editor.markup).toContain(
      'green<span class="nui-content__colour nui-content__colour--blue">blue</span>',
    );
  });

  it('opens the bubble over a selected range and closes it when the range collapses', async () => {
    const editor = mounted({ document: page('Hello world'), toolbar: 'bubble' });

    expect(editor.hasToolbar).toBe(false);

    editor.focus();
    await editor.select(1, 6);

    expect(editor.bubbleShown).toBe(true);

    expect(editor.bubbleTools).toEqual([
      'Bold',
      'Italic',
      'Underline',
      'Strikethrough',
      'Inline code',
      'Link',
      'Colour',
    ]);

    await editor.press('F10', { alt: true });

    expect(editor.toolbarFocus).toBe('Bold');

    await editor.toolbarKey('Escape');
    await editor.select(3);

    expect(editor.bubbleShown).toBe(false);
  });
});
