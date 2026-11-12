import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON } from '@numior/editor-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { installTouch } from './support/media';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;
let restore: (() => void) | undefined;

beforeAll(() => {
  installPopovers();
});

beforeEach(() => {
  restore = installTouch();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
  restore?.();
});

const item = (id: string, text: string) =>
  contentSchema.element('list_item', {
    id,
    content: [
      contentSchema.element('paragraph', { id: `${id}p`, content: [contentSchema.text(text)] }),
    ],
  });

const list = (): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      contentSchema.element('doc', {
        id: 'root',
        content: [
          contentSchema.element('bullet_list', {
            id: 'l',
            content: [item('a', 'One'), item('b', 'Two')],
          }),
        ],
      }),
    ),
  );

const nestedLists = (document: DocJSON | undefined): number =>
  (JSON.stringify(document).match(/"bullet_list"/gu) ?? []).length;

describe('NuiEditor on a touch screen', () => {
  it('docks the toolbar at the bottom while the editor has focus and nests list items from it', async () => {
    const editor = EditorDriver.mount({ document: list() });

    driver = editor;

    expect(editor.hasToolbar).toBe(false);

    editor.focus();
    await editor.select(11);

    expect(editor.dockedToolbar).toBe(true);
    expect(editor.tools).toEqual(expect.arrayContaining(['Outdent', 'Indent']));
    expect(editor.available('Indent')).toBe(true);

    await editor.useTool('Indent');

    expect(nestedLists(editor.documents.at(-1))).toBe(2);

    await editor.blur();

    expect(editor.hasToolbar).toBe(false);
  });

  it('keeps the actions for the selection in the toolbar of a read-only editor, the bubble stays shut', async () => {
    const editor = EditorDriver.mount({
      document: list(),
      readonly: true,
      selectionActions: [{ key: 'note', label: 'Note', icon: 'comment', command: () => true }],
    });

    driver = editor;

    editor.focus();
    await editor.select(4, 6);

    expect(editor.dockedToolbar).toBe(false);
    expect(editor.tools).toEqual(['Note']);
    expect(editor.bubbleShown).toBe(false);
  });
});
