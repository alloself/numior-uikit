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

const block = (id: string, type: string, text: string, attrs = {}) =>
  contentSchema.element(type, { id, attrs, content: [contentSchema.text(text)] });

const item = (id: string, text: string) =>
  contentSchema.element('list_item', { id, content: [block(`${id}p`, 'paragraph', text)] });

const three = () =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          block('a', 'paragraph', 'a'),
          block('b', 'heading', 'b', { level: 2 }),
          block('c', 'paragraph', 'c'),
        ],
      }),
    ),
  );

describe('NuiEditor block handles', () => {
  it('shows a handle on the hovered block and runs its menu actions', async () => {
    const editor = mounted({ document: three() });

    expect(editor.handleShown).toBe(false);

    await editor.hoverBlock(1);

    expect(editor.handleShown).toBe(true);
    expect(editor.pushedTexts).toEqual(['h2:b']);

    await editor.hoverGap();

    expect(editor.pushedTexts).toEqual(['h2:b']);

    await editor.hoverToolbar();

    expect(editor.handleShown).toBe(false);
    expect(editor.pushedTexts).toEqual([]);

    await editor.hoverBlock(1);

    await editor.blockAction('Duplicate');

    expect(editor.blockTexts).toEqual(['p:a', 'h2:b', 'h2:b', 'p:c']);

    await editor.hoverBlock(0);
    await editor.blockAction('Move down');

    expect(editor.blockTexts).toEqual(['h2:b', 'p:a', 'h2:b', 'p:c']);

    await editor.hoverBlock(3);
    await editor.blockAction('Turn into', 'Heading 1');

    expect(editor.blockTexts).toEqual(['h2:b', 'p:a', 'h2:b', 'h1:c']);

    await editor.hoverBlock(1);
    await editor.blockAction('Delete');

    expect(editor.blockTexts).toEqual(['h2:b', 'h2:b', 'h1:c']);
    expect(editor.focused).toBe(true);
  });

  it('puts the handle on list items and moves them among their siblings', async () => {
    const editor = mounted({
      document: toJSON(
        createDoc(
          contentSchema,
          contentSchema.element('doc', {
            id: 'root',
            content: [
              contentSchema.element('bullet_list', {
                id: 'list',
                content: [item('i1', 'one'), item('i2', 'two'), item('i3', 'three')],
              }),
            ],
          }),
        ),
      ),
    });

    await editor.hoverList();

    expect(editor.pushedTexts).toEqual(['li:one']);

    await editor.hoverItem('one');

    expect(editor.handleShown).toBe(true);

    await editor.blockAction('Move down');

    expect(editor.itemTexts).toEqual(['two', 'one', 'three']);

    await editor.hoverItem('three');
    await editor.blockAction('Delete');

    expect(editor.itemTexts).toEqual(['two', 'one']);

    await editor.hoverItem('two');
    await editor.blockAction('Whole list');

    expect(editor.pushedTexts).toEqual(['ul:twoone']);

    await editor.leave();

    expect(editor.pushedTexts).toEqual(['ul:twoone']);

    await editor.hoverItem('one');

    expect(editor.pushedTexts).toEqual(['ul:twoone']);

    await editor.blockAction('Duplicate');

    expect(editor.itemTexts).toEqual(['two', 'one', 'two', 'one']);

    await editor.leave();

    expect(editor.handleShown).toBe(false);
  });

  it('drags a block by its handle past the blocks below it', async () => {
    const editor = mounted({ document: three() });

    await editor.dragHandle(0, 40);

    expect(editor.dropShown).toBe(true);
    expect(editor.ghostCopy).toEqual(['p:a']);
    expect(editor.blockTexts).toEqual(['h2:b', 'p:c', 'p:a']);
    expect(editor.handleShown).toBe(false);
  });

  it('moves the block under the cursor with Ctrl+Shift and arrows', async () => {
    const editor = mounted({ document: three() });

    editor.focus();
    await editor.select(2);
    await editor.press('ArrowDown', { ctrl: true, shift: true });

    expect(editor.blockTexts).toEqual(['h2:b', 'p:a', 'p:c']);
  });

  it('leaves out handles when read-only or turned off', async () => {
    const editor = mounted({ document: three(), blockHandles: false });

    await editor.hoverBlock(1);

    expect(editor.handleShown).toBe(false);

    await editor.receive({ blockHandles: true, readonly: true });
    await editor.hoverBlock(1);

    expect(editor.handleShown).toBe(false);
  });

  it('stands beside an image with room before it instead of pushing it off its alignment', async () => {
    const editor = mounted({
      document: toJSON(
        createDoc(
          contentSchema,
          contentSchema.element('doc', {
            id: 'root',
            content: [
              block('a', 'paragraph', 'a'),
              contentSchema.element('image', { id: 'i', attrs: { src: 'a.png', width: 0.4 } }),
            ],
          }),
        ),
      ),
    });

    await editor.hoverBlock(1);

    expect(editor.handleShown).toBe(true);
    expect(editor.handleBeside).toBe(true);
    expect(editor.pushedTexts).toEqual([]);

    await editor.hoverBlock(0);

    expect(editor.handleBeside).toBe(false);
    expect(editor.pushedTexts).toEqual(['p:a']);
  });
});
