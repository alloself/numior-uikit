import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON, type NodeJSON } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
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

const paragraphs = (...texts: readonly string[]): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: texts.map((text, index) =>
          contentSchema.element('paragraph', {
            id: `p${String(index)}`,
            content: text === '' ? [] : [contentSchema.text(text)],
          }),
        ),
      }),
    ),
  );

const textOf = (node: NodeJSON): string =>
  'text' in node ? node.text : (node.content ?? []).map(textOf).join('');

const pieceOf = (node: NodeJSON): string => {
  if ('text' in node) {
    return node.text;
  }
  const attrs = node.attrs ?? {};

  switch (node.type) {
    case 'image':
      return `[image:${String(attrs.src)}:${String(attrs.wrap ?? 'inline')}]`;
    case 'file':
      return `[file:${String(attrs.name)}:${String(attrs.size)}:${String(attrs.type)}]`;
    default:
      return textOf(node);
  }
};

const blockOf = (block: NodeJSON): string =>
  'text' in block ? block.text : `${block.type}:${(block.content ?? []).map(pieceOf).join('')}`;

const blocksOf = (document: DocJSON | undefined): readonly string[] =>
  (document?.root.content ?? []).map(blockOf);

const editing = async (
  document: DocJSON,
  props: Parameters<typeof EditorDriver.mount>[0] = {},
): Promise<EditorDriver> => {
  driver = EditorDriver.mount({ document, ...props });
  driver.focus();
  await driver.select(6);
  return driver;
};

describe('NuiEditor uploads', () => {
  it('shows pasted files beside the document and inserts each one when it is uploaded', async () => {
    const server = new FakeUploads();

    const editor = await editing(paragraphs('Intro', 'Next'), {
      upload: server.adapter,
    });

    const uploads = EditorUploadDriver.of(editor);

    await uploads.pasteFiles([
      fileOf('photo.png', 'image/png'),
      fileOf('report.pdf', 'application/pdf', 2048),
    ]);

    expect(uploads.cards).toEqual([
      'photo.png|Uploading… 0%|preview',
      'report.pdf|Uploading… 0%|icon',
    ]);

    expect(uploads.cardPlaces).toEqual(['p:Intro', 'upload', 'upload', 'p:Next']);
    expect(editor.changes).toBe(0);

    server.of('photo.png').progress(0.5);
    await uploads.settle();

    expect(uploads.cards[0]).toBe('photo.png|Uploading… 50%|preview');

    server.of('photo.png').finish('https://cdn.test/photo.png');
    await uploads.settle();

    expect(blocksOf(editor.documents.at(-1))).toEqual([
      'paragraph:Intro[image:https://cdn.test/photo.png:inline]',
      'paragraph:Next',
    ]);

    expect(uploads.cards).toEqual(['report.pdf|Uploading… 0%|icon']);
    expect(uploads.announcement).toBe('photo.png is uploaded');

    server.of('report.pdf').finish('https://cdn.test/report.pdf');
    await uploads.settle();

    expect(blocksOf(editor.documents.at(-1))).toEqual([
      'paragraph:Intro[image:https://cdn.test/photo.png:inline][file:report.pdf:2048:application/pdf]',
      'paragraph:Next',
    ]);

    expect(uploads.cards).toEqual([]);
  });

  it('cancels an upload without a trace and retries one that failed', async () => {
    const server = new FakeUploads();
    const editor = await editing(paragraphs('Intro'), { upload: server.adapter });
    const uploads = EditorUploadDriver.of(editor);

    await uploads.pasteFiles([fileOf('draft.txt', 'text/plain')]);
    await uploads.act('Cancel the upload of draft.txt');

    expect(server.of('draft.txt').signal.aborted).toBe(true);
    expect(uploads.cards).toEqual([]);
    expect(editor.changes).toBe(0);

    await uploads.pasteFiles([fileOf('notes.txt', 'text/plain')]);
    server.of('notes.txt').fail('Server is busy');
    await uploads.settle();

    expect(uploads.cards).toEqual(['notes.txt|Server is busy|icon']);
    expect(uploads.actions()).toEqual(['Retry', 'Remove']);
    expect(uploads.announcement).toBe('Could not upload notes.txt');

    await uploads.act('Retry');
    server.of('notes.txt').finish('https://cdn.test/notes.txt');
    await uploads.settle();

    expect(blocksOf(editor.documents.at(-1))).toEqual([
      'paragraph:Intro[file:notes.txt:4:text/plain]',
    ]);
  });

  it('shows a card with the reason in place of a file that does not fit until it is removed', async () => {
    const server = new FakeUploads();

    const editor = await editing(paragraphs('Intro'), {
      upload: server.adapter,
      accept: 'image/*',
      maxSize: 1024,
    });

    const uploads = EditorUploadDriver.of(editor);

    await uploads.pasteFiles([
      fileOf('tool.exe', 'application/octet-stream'),
      fileOf('huge.png', 'image/png', 4096),
    ]);

    expect(uploads.cards).toEqual([
      'tool.exe|This file type is not accepted|icon',
      'huge.png|The file is larger than 1 kB|icon',
    ]);

    expect(uploads.actions(0)).toEqual(['Remove']);
    expect(server.started).toEqual([]);

    expect(uploads.announcement).toBe(
      'tool.exe: this file type is not accepted huge.png is larger than 1 kB',
    );

    await uploads.act('Remove', 0);
    await uploads.act('Remove', 0);

    expect(uploads.cards).toEqual([]);
    expect(editor.documents).toEqual([]);
  });

  it('places a refused pick from the slash menu as a card beside the accepted one', async () => {
    const server = new FakeUploads();

    const editor = await editing(paragraphs('Intro', ''), {
      upload: server.adapter,
      maxSize: 1024,
    });

    const uploads = EditorUploadDriver.of(editor);

    await editor.select(8);
    await editor.type('/ima');
    await editor.clickSlash('Image');
    await uploads.pick([fileOf('cat.jpg', 'image/jpeg'), fileOf('huge.png', 'image/png', 4096)]);

    expect(uploads.cards).toEqual([
      'cat.jpg|Uploading… 0%|preview',
      'huge.png|The file is larger than 1 kB|icon',
    ]);

    expect(server.started.map((upload) => upload.file.name)).toEqual(['cat.jpg']);
  });

  it('keeps text pastes as text even when the clipboard also carries a picture', async () => {
    const server = new FakeUploads();
    const editor = await editing(paragraphs('Intro'), { upload: server.adapter });
    const uploads = EditorUploadDriver.of(editor);

    await uploads.pasteFiles([fileOf('cells.png', 'image/png')], ' cells');

    expect(uploads.cards).toEqual([]);
    expect(blocksOf(editor.documents.at(-1))).toEqual(['paragraph:Intro cells']);
  });

  it('opens a picker for images and files from the slash menu', async () => {
    const server = new FakeUploads();
    const editor = await editing(paragraphs('Intro', ''), { upload: server.adapter });
    const uploads = EditorUploadDriver.of(editor);

    await editor.select(8);
    await editor.type('/ima');
    await editor.clickSlash('Image');

    expect(uploads.panelLabel).toBe('Image');
    expect(uploads.panelTabs).toEqual(['Upload', 'By link']);
    expect(uploads.pickerAccept).toBe('image/*');

    await uploads.pick([fileOf('cat.jpg', 'image/jpeg')]);

    expect(uploads.cardPlaces).toEqual(['p:Intro', 'upload', 'p:']);

    server.of('cat.jpg').finish('https://cdn.test/cat.jpg');
    await uploads.settle();

    expect(blocksOf(editor.documents.at(-1))).toEqual([
      'paragraph:Intro',
      'paragraph:[image:https://cdn.test/cat.jpg:break]',
    ]);
  });

  it('inserts images and files by link without an upload adapter', async () => {
    const editor = await editing(paragraphs('Intro', ''));
    const uploads = EditorUploadDriver.of(editor);

    await uploads.pasteFiles([fileOf('photo.png', 'image/png')]);

    expect(uploads.announcement).toBe('Files cannot be uploaded here; insert them by link');
    expect(uploads.cards).toEqual([]);

    await editor.select(8);
    await editor.type('/file');
    await editor.clickSlash('File');

    expect(uploads.panelLabel).toBe('File');
    expect(uploads.panelTabs).toEqual([]);

    await uploads.insertLink('javascript:alert(1)');

    expect(uploads.linkError).toBe('Enter a web address');

    await uploads.insertLink('https://numior.test/files/Price%20list.pdf?v=2');

    expect(blocksOf(editor.documents.at(-1))).toEqual([
      'paragraph:Intro',
      'paragraph:[file:Price list.pdf:null:]',
    ]);
  });

  it('ignores dropped files in read mode and announces an address the schema refuses', async () => {
    const server = new FakeUploads();
    const editor = await editing(paragraphs('Intro'), { upload: server.adapter });
    const uploads = EditorUploadDriver.of(editor);

    await uploads.pasteFiles([fileOf('local.png', 'image/png')]);
    server.of('local.png').finish('blob:https://numior.test/1');
    await uploads.settle();

    expect(uploads.cards).toEqual([]);
    expect(uploads.announcement).toBe('local.png is uploaded, but there is no place left for it');
    expect(editor.changes).toBe(0);

    await editor.receive({ readonly: true });
    await uploads.pasteFiles([fileOf('late.png', 'image/png')]);

    expect(uploads.cards).toEqual([]);
    expect(server.started.map((upload) => upload.file.name)).toEqual(['local.png']);
  });

  it('offers image uploads only for image types the editor accepts', async () => {
    const server = new FakeUploads();

    const editor = await editing(paragraphs('Intro', ''), {
      upload: server.adapter,
      accept: 'application/pdf, .png',
    });

    const uploads = EditorUploadDriver.of(editor);

    await editor.select(8);
    await editor.type('/ima');
    await editor.clickSlash('Image');

    expect(uploads.panelTabs).toEqual(['Upload', 'By link']);
    expect(uploads.pickerAccept).toBe('.png');

    await editor.receive({ accept: 'application/pdf' });

    expect(uploads.panelTabs).toEqual([]);
  });
});
