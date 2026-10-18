import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON, type ElementJSON } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { EditorImageDriver } from './drivers/editor-image';
import { EditorUploadDriver } from './drivers/editor-uploads';
import { installPopovers } from './support/popovers';
import { FakeUploads, fileOf } from './support/uploads';

let driver: EditorDriver | undefined;

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const picture = (): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('paragraph', {
            id: 'line',
            content: [
              contentSchema.element('image', {
                id: 'img',
                attrs: { src: 'https://cdn.test/a.png', width: 0.5, wrap: 'break' },
              }),
            ],
          }),
          contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text('After')] }),
        ],
      }),
    ),
  );

const isElement = (value: unknown): value is ElementJSON =>
  typeof value === 'object' && value !== null && 'type' in value;

const imagesIn = (nodes: readonly unknown[]): ElementJSON[] =>
  nodes.flatMap((node) =>
    isElement(node)
      ? [...(node.type === 'image' ? [node] : []), ...imagesIn(node.content ?? [])]
      : [],
  );

const imageAttrs = (editor: EditorDriver) =>
  imagesIn(editor.documents.at(-1)?.root.content ?? [])[0]?.attrs;

const blockTypes = (editor: EditorDriver): readonly string[] =>
  (editor.documents.at(-1)?.root.content ?? []).map((block) =>
    isElement(block) ? block.type : 'text',
  );

const mounted = async (
  props: Parameters<typeof EditorDriver.mount>[0] = {},
): Promise<EditorDriver> => {
  driver = EditorDriver.mount({ document: picture(), ...props });
  await driver.showBlocks();
  return driver;
};

describe('NuiEditor image', () => {
  it('sizes the image from its grips with the keyboard within a fifth and the whole line', async () => {
    const editor = await mounted();
    const image = EditorImageDriver.of(editor);

    expect(image.look).toBe(
      'nui-content__image nui-content__image--wrap-break nui-content__image--align-center|inline-size: 50%;',
    );

    expect(image.grips).toEqual(['Image width:50']);

    await image.pressGrip('ArrowRight');

    expect(imageAttrs(editor)?.width).toBe(0.55);

    await image.pressGrip('Home');

    expect(imageAttrs(editor)?.width).toBe(0.2);
    expect(image.grips[0]).toBe('Image width:20');

    await image.pressGrip('End');

    expect(imageAttrs(editor)?.width).toBe(1);
  });

  it('shows the bar on a selected image to align it and describe it', async () => {
    const editor = await mounted();
    const image = EditorImageDriver.of(editor);

    expect(image.barShown).toBe(false);

    await image.select();

    expect(image.barControls).toEqual([
      'In line with text',
      'Wrap text',
      'Break text',
      'Align to the line start',
      'Centre',
      'Align to the line end',
      'Download',
      'Alt text',
    ]);

    await image.align('Align to the line end');

    expect(imageAttrs(editor)?.align).toBe('end');
    expect(image.look).toContain('nui-content__image--align-end');

    await image.align('Wrap text');

    expect(imageAttrs(editor)?.wrap).toBe('wrap');
    expect(image.barControls).not.toContain('Centre');

    await image.align('In line with text');

    expect(imageAttrs(editor)?.wrap).toBe('inline');

    expect(image.barControls).toEqual([
      'In line with text',
      'Wrap text',
      'Break text',
      'Download',
      'Alt text',
    ]);

    await image.describe('  A red fox  ');

    expect(imageAttrs(editor)?.alt).toBe('A red fox');
  });

  it('keeps the caption under the image and goes on writing below it after Enter', async () => {
    const editor = await mounted();
    const image = EditorImageDriver.of(editor);

    await image.writeCaption('Fox in the snow');

    expect(imageAttrs(editor)?.caption).toBe('Fox in the snow');
    expect(blockTypes(editor)).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(editor.focused).toBe(true);

    await image.writeCaption('Ignored', 'Escape');

    expect(imageAttrs(editor)?.caption).toBe('Fox in the snow');
  });

  it('replaces the picture through the upload adapter and shows the progress over it', async () => {
    const server = new FakeUploads();
    const editor = await mounted({ upload: server.adapter });
    const image = EditorImageDriver.of(editor);
    const uploads = EditorUploadDriver.of(editor);

    await image.select();

    expect(image.barControls).toContain('Replace');

    await image.replaceWith(fileOf('b.png', 'image/png'));
    server.of('b.png').progress(0.4);
    await uploads.settle();

    expect(image.progress).toBe('40');
    expect(uploads.cards).toEqual([]);

    server.of('b.png').finish('https://cdn.test/b.png');
    await uploads.settle();

    expect(imageAttrs(editor)?.src).toBe('https://cdn.test/b.png');
    expect(image.progress).toBeUndefined();
  });

  it('keeps the latest replacement when two uploads race for one image', async () => {
    const server = new FakeUploads();
    const editor = await mounted({ upload: server.adapter });
    const image = EditorImageDriver.of(editor);
    const uploads = EditorUploadDriver.of(editor);

    await image.select();
    await image.replaceWith(fileOf('big.png', 'image/png'));
    await image.replaceWith(fileOf('small.png', 'image/png'));

    expect(server.of('big.png').signal.aborted).toBe(true);

    server.of('small.png').finish('https://cdn.test/small.png');
    server.of('big.png').finish('https://cdn.test/big.png');
    await uploads.settle();

    expect(imageAttrs(editor)?.src).toBe('https://cdn.test/small.png');
  });

  it('hides the image bar when the focus leaves the editor', async () => {
    const editor = await mounted();
    const image = EditorImageDriver.of(editor);

    await image.select();

    expect(image.barShown).toBe(true);

    await editor.blur();

    expect(image.barShown).toBe(false);
  });
});
