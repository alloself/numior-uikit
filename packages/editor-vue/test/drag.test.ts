import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type ContentNode, type ElementNode } from '@numior/editor-core';
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

const element = (
  type: string,
  id: string,
  content: readonly (ContentNode | string)[] = [],
): ElementNode =>
  contentSchema.element(type, {
    id,
    content: content.map((child) =>
      typeof child === 'string' ? contentSchema.text(child) : child,
    ),
  });

const paragraph = (id: string, text: string): ElementNode => element('paragraph', id, [text]);

const item = (id: string, text: string): ElementNode =>
  element('list_item', id, [paragraph(`${id}p`, text)]);

const mounted = (): EditorDriver => {
  driver = EditorDriver.mount({
    document: toJSON(
      createDoc(
        contentSchema,
        contentSchema.element('doc', {
          id: 'root',
          content: [
            paragraph('a', 'a'),
            element('callout', 'c', [paragraph('n', 'note'), paragraph('m', 'more')]),
            element('bullet_list', 'l', [item('i1', 'one'), item('i2', 'two')]),
            paragraph('z', 'z'),
          ],
        }),
      ),
    ),
  });

  return driver;
};

describe('NuiEditor block drag across containers', () => {
  it('drops a block after a line inside a callout', async () => {
    const editor = mounted();

    await editor.dragBlockTo('a', 50, 61);

    expect(editor.blockTexts).toEqual(['div:notemorea', 'ul:onetwo', 'p:z']);
  });

  it('drops a block right under the first line of a callout', async () => {
    const editor = mounted();

    await editor.dragBlockTo('z', 50, 45);

    expect(editor.blockTexts).toEqual(['p:a', 'div:notezmore', 'ul:onetwo']);
  });

  it('turns a paragraph into an item when it lands between list items', async () => {
    const editor = mounted();

    await editor.dragBlockTo('z', 50, 81);

    expect(editor.itemTexts).toEqual(['z', 'one', 'two']);
  });

  it('places a block beside another as columns from the far edge', async () => {
    const editor = mounted();

    await editor.dragBlockTo('a', 395, 160);

    expect(editor.blockTexts).toEqual(['div:notemore', 'ul:onetwo', 'div:za']);
  });

  it('lets go of the pointer when the editor goes away in the middle of a drag', async () => {
    const editor = mounted();

    await editor.liftBlock('a', 50, 61);
    expect(editor.movePointer(50, 70)).toBe(true);

    editor.destroy();
    driver = undefined;

    expect(editor.movePointer(50, 80)).toBe(false);
  });

  it('keeps a block where it is when it lands on its own place', async () => {
    const editor = mounted();

    await editor.dragBlockTo('a', 50, 5);

    expect(editor.blockTexts).toEqual(['p:a', 'div:notemore', 'ul:onetwo', 'p:z']);
  });
});
