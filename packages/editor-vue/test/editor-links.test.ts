import { contentSchema } from '@numior/content';
import {
  createDoc,
  toJSON,
  type DocJSON,
  type ElementJSON,
  type NodeJSON,
} from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import type { NuiEditorLinkMetadata } from '../src';
import { EditorDriver } from './drivers/editor';
import { EditorLinksDriver } from './drivers/editor-links';
import { EditorUploadDriver } from './drivers/editor-uploads';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const lines = (...texts: readonly string[]): DocJSON =>
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

const isElement = (node: NodeJSON): node is ElementJSON => 'type' in node;

const lineOf = (block: ElementJSON): string => {
  const attrs = block.attrs ?? {};

  switch (block.type) {
    case 'embed':
      return `embed:${String(attrs.provider)}:${String(attrs.url)}`;
    case 'bookmark':
      return `bookmark:${String(attrs.title)}:${String(attrs.site)}`;
    default:
      return `${block.type}:${(block.content ?? []).map((child) => ('text' in child ? child.text : '')).join('')}`;
  }
};

const outline = (document: DocJSON | undefined): readonly string[] =>
  (document?.root.content ?? []).reduce<string[]>((found, node) => {
    if (isElement(node)) {
      found.push(lineOf(node));
    }
    return found;
  }, []);

const metadata: NuiEditorLinkMetadata = (url) =>
  Promise.resolve({ title: 'Numior blog', description: 'News', site: new URL(url).hostname });

const editing = async (
  document: DocJSON,
  props: Parameters<typeof EditorDriver.mount>[0] = {},
): Promise<EditorDriver> => {
  driver = EditorDriver.mount({ document, ...props });
  driver.focus();
  return driver;
};

describe('NuiEditor embeds and bookmarks', () => {
  it('offers to embed or bookmark a bare link pasted into an empty line', async () => {
    const editor = await editing(lines('Intro', ''), { embeds: ['youtube'] });
    const links = EditorLinksDriver.of(editor);

    await editor.select(8);
    await editor.pasteHTML('', VIDEO);

    expect(outline(editor.documents.at(-1))).toEqual(['paragraph:Intro', `paragraph:${VIDEO}`]);
    expect(links.pasteOptions).toEqual(['Embed YouTube', 'Bookmark', 'Keep as a link']);

    await links.choosePaste('Embed YouTube');

    expect(outline(editor.documents.at(-1))).toEqual([
      'paragraph:Intro',
      `embed:youtube:${VIDEO}`,
      'paragraph:',
    ]);

    await editor.showBlocks();

    expect(links.frames).toEqual(['frame:https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']);

    expect(links.framePermissions).toEqual([
      'fullscreen; picture-in-picture; encrypted-media; clipboard-write',
    ]);
  });

  it('bookmarks a link with a snapshot of its metadata that one undo removes', async () => {
    const editor = await editing(lines(''), { linkMetadata: metadata });
    const links = EditorLinksDriver.of(editor);

    await editor.select(1);
    await editor.pasteHTML('', 'https://numior.test/blog');

    expect(links.pasteOptions).toEqual(['Bookmark', 'Keep as a link']);

    await links.choosePaste('Bookmark');

    expect(outline(editor.documents.at(-1))).toEqual([
      'bookmark:Numior blog:numior.test',
      'paragraph:',
    ]);

    await editor.showBlocks();

    expect(links.bookmarks).toEqual(['Numior blog|News|numior.test']);

    await editor.press('z', { ctrl: true });

    expect(outline(editor.documents.at(-1))).toEqual(['paragraph:https://numior.test/blog']);
  });

  it('links a pasted address in running text and over a selection without asking', async () => {
    const editor = await editing(lines('Read this'), { embeds: ['youtube'] });
    const links = EditorLinksDriver.of(editor);

    await editor.select(6, 10);
    await editor.pasteHTML('', 'https://numior.test/a');

    expect(links.pasteOptions).toEqual([]);

    expect(editor.markup).toContain(
      '<a class="nui-content__link" href="https://numior.test/a">this</a>',
    );

    await editor.select(1);
    await editor.pasteHTML('', VIDEO);

    expect(links.pasteOptions).toEqual([]);
    expect(editor.markup).toContain(`>${VIDEO.replaceAll('&', '&amp;')}</a>`);
  });

  it('embeds from the slash menu only links an allowed provider recognises', async () => {
    const editor = await editing(lines(''), { embeds: ['vimeo'] });
    const uploads = EditorUploadDriver.of(editor);

    await editor.select(1);
    await editor.type('/emb');
    await editor.clickSlash('Embed');
    await uploads.insertLink(VIDEO);

    expect(uploads.linkError).toBe('This link cannot be embedded');

    await uploads.insertLink('https://vimeo.com/76979871');

    expect(outline(editor.documents.at(-1))).toEqual([
      'embed:vimeo:https://vimeo.com/76979871',
      'paragraph:',
    ]);
  });

  it('turns an embed into a bookmark from its bar and shows refused providers as a link', async () => {
    const editor = await editing(lines(''), { embeds: ['youtube'], linkMetadata: metadata });
    const links = EditorLinksDriver.of(editor);

    await editor.select(1);
    await editor.pasteHTML('', VIDEO);
    await links.choosePaste('Embed YouTube');
    await editor.showBlocks();
    await links.select('.nui-editor-embed__cover');

    expect(links.barActions).toEqual(['Open link', 'Show as bookmark', 'Edit link']);

    await links.act('Show as bookmark');

    expect(outline(editor.documents.at(-1))).toEqual([
      'bookmark:Numior blog:www.youtube.com',
      'paragraph:',
    ]);

    await editor.receive({ embeds: [] });

    await editor.receive({
      document: toJSON(
        createDoc(
          contentSchema,
          contentSchema.element('doc', {
            id: 'root',
            content: [
              contentSchema.element('embed', {
                id: 'e',
                attrs: { url: VIDEO, provider: 'youtube' },
              }),
            ],
          }),
        ),
      ),
    });

    await editor.showBlocks();

    expect(links.frames).toEqual(['none:YouTube embeds are not allowed here']);
  });

  it('changes the address of an embed and a bookmark from their bars within what each holds', async () => {
    const editor = await editing(lines(''), {
      embeds: ['youtube', 'vimeo'],
      linkMetadata: metadata,
    });

    const links = EditorLinksDriver.of(editor);

    await editor.select(1);
    await editor.pasteHTML('', VIDEO);
    await links.choosePaste('Embed YouTube');
    await editor.showBlocks();
    await links.select('.nui-editor-embed__cover');
    await links.act('Edit link');
    await links.relink('https://numior.test/news');

    expect(links.relinkError).toBe('This link cannot be embedded');

    await links.relink('https://vimeo.com/76979871');

    expect(links.editing).toBe(false);

    expect(outline(editor.documents.at(-1))).toEqual([
      'embed:vimeo:https://vimeo.com/76979871',
      'paragraph:',
    ]);

    await editor.press('z', { ctrl: true });

    expect(outline(editor.documents.at(-1))).toEqual([`embed:youtube:${VIDEO}`, 'paragraph:']);

    await links.act('Show as bookmark');
    await editor.showBlocks();
    await links.select('.nui-content__bookmark-link');
    await links.act('Edit bookmark');
    await links.relink('https://blog.numior.test/2-4');

    expect(outline(editor.documents.at(-1))).toEqual([
      'bookmark:Numior blog:blog.numior.test',
      'paragraph:',
    ]);

    await links.act('Edit bookmark');
    await links.relink('https://blog.numior.test/2-4', { title: 'Release 2.4' });

    expect(outline(editor.documents.at(-1))).toEqual([
      'bookmark:Release 2.4:blog.numior.test',
      'paragraph:',
    ]);

    await links.act('Edit bookmark');
    await links.relink('https://numior.test/news', { description: 'Our news' });
    await editor.showBlocks();

    expect(links.bookmarks).toEqual(['Numior blog|Our news|numior.test']);
  });
});
