import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON, type ElementNode } from '@numior/editor-core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { EditorDriver } from './drivers/editor';
import { EditorTableDriver } from './drivers/editor-table';
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
  vi.useRealTimers();
});

const element = (
  type: string,
  id: string,
  content: readonly ElementNode[] = [],
  attrs: Readonly<Record<string, string | number | boolean | null>> = {},
): ElementNode => contentSchema.element(type, { id, attrs, content });

const row = (id: string, ...values: readonly (string | number | null)[]): ElementNode =>
  element(
    'table_row',
    id,
    values.map((value, index) => element('table_cell', `${id}-${String(index)}`, [], { value })),
  );

const prices = (): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      element('doc', 'root', [
        element('paragraph', 'p'),
        element('table', 't', [
          element('table_head', 'h', [
            element('table_column', 'name', [], { name: 'Item' }),
            element('table_column', 'price', [], { name: 'Price', type: 'number' }),
            element(
              'table_column',
              'state',
              [element('table_option', 'o1', [], { label: 'Open' })],
              {
                name: 'State',
                type: 'select',
              },
            ),
          ]),
          element('table_body', 'b', [row('r1', 'Pears', 12, 'Open'), row('r2', 'Plums', 3, null)]),
        ]),
      ]),
    ),
  );

const tableJSON = (editor: EditorDriver) =>
  editor.documents.at(-1)?.root.content?.find((block) => 'type' in block && block.type === 'table');

const shown = async (document = prices()) => {
  const editor = mounted({ document });
  const table = EditorTableDriver.of(editor);

  await table.show();
  return { editor, table };
};

describe('NuiEditor table block', () => {
  it('draws the table from the document with typed cells and option badges', async () => {
    const { table } = await shown();

    expect(table.heads).toEqual(['Item', 'Price', 'State']);
    expect(table.rows).toEqual(['Pears|12|Open|', 'Plums|3||']);
    expect(table.actions).toEqual(['Row', 'Column']);
  });

  it('writes cell edits into the document as one undo step and learns new options', async () => {
    const { editor, table } = await shown();

    await table.edit(0, 1, 15);
    await table.edit(1, 2, 'Late');

    expect(table.rows).toEqual(['Pears|15|Open|', 'Plums|3|Late|']);
    expect(JSON.stringify(tableJSON(editor))).toContain('"label":"Late"');
    expect(await table.undo()).toBe(1);
    expect(table.rows).toEqual(['Pears|15|Open|', 'Plums|3||']);
    expect(JSON.stringify(tableJSON(editor))).not.toContain('"label":"Late"');
  });

  it('adds and removes rows and columns from the buttons and the menus', async () => {
    const { table } = await shown();

    await table.clickAction('Row');
    expect(table.rowCount).toBe(3);
    await table.rowAction(0, 'Insert row above');
    await table.rowAction(1, 'Insert row below');
    expect(table.rowCount).toBe(5);
    await table.rowAction(0, 'Delete row');
    expect(table.rowCount).toBe(4);
    await table.clickAction('Column');
    expect(table.heads).toEqual(['Item', 'Price', 'State', 'Column 4']);
    await table.columnAction(0, 'Insert column before');
    await table.columnAction(4, 'Delete column');
    expect(table.heads).toEqual(['Column 1', 'Item', 'Price', 'State']);
  });

  it('renames, retypes and reorders columns and keeps resized widths', async () => {
    vi.useFakeTimers();

    const { editor, table } = await shown();

    expect(table.columnEntries(0)).toEqual([
      'Rename',
      'Type',
      'Insert column before',
      'Insert column after',
      'Delete column',
    ]);

    await table.rename(0, ' Goods ');
    await table.retype(1, 'text');
    await table.order([1, 0, 2]);

    expect(table.heads).toEqual(['Price', 'Goods', 'State']);
    expect(table.rows).toEqual(['12|Pears|Open|', '3|Plums||']);

    table.resize(0, 210);
    await vi.advanceTimersByTimeAsync(500);

    expect(JSON.stringify(tableJSON(editor))).toContain('"width":210');
  });

  it('keeps the sort and the filters in the document as one undo step each', async () => {
    const { editor, table } = await shown();

    await table.sortBy(1, 'asc');
    expect(table.rows).toEqual(['Plums|3||', 'Pears|12|Open|']);
    expect(JSON.stringify(tableJSON(editor))).toContain('"sort":"asc","sortRank":1');
    await table.filterBy(0, 'Pe');
    expect(table.rows).toEqual(['Pears|12|Open|']);
    expect(JSON.stringify(tableJSON(editor))).toContain('"type":"table_filter"');
    expect(await table.undo()).toBe(1);
    expect(table.rows).toEqual(['Plums|3||', 'Pears|12|Open|']);
    expect(await table.undo()).toBe(1);
    expect(table.rows).toEqual(['Pears|12|Open|', 'Plums|3||']);
  });

  it('moves rows dropped by their grip and inserts a table from the slash menu', async () => {
    const { editor, table } = await shown();

    await table.reorder(0, 1);
    expect(table.rows).toEqual(['Plums|3||', 'Pears|12|Open|']);

    editor.focus();
    await editor.select(1);
    await editor.type('/');
    await editor.clickSlash('Table');

    const inserted = editor.documents
      .at(-1)
      ?.root.content?.filter((block) => 'type' in block && block.type === 'table');

    expect(inserted).toHaveLength(2);
    expect(JSON.stringify(inserted?.[0])).toContain('"name":"Column 3"');
  });

  it('ticks checkbox cells with the kit checkbox as one undo step', async () => {
    const { table } = await shown(
      toJSON(
        createDoc(
          contentSchema,
          element('doc', 'root', [
            element('table', 't', [
              element('table_head', 'h', [
                element('table_column', 'done', [], { name: 'Done', type: 'boolean' }),
              ]),
              element('table_body', 'b', [row('r1', null)]),
            ]),
          ]),
        ),
      ),
    );

    expect(table.checks).toEqual([false]);
    await table.check(0);
    expect(table.checks).toEqual([true]);
    expect(await table.undo()).toBe(1);
    expect(table.checks).toEqual([false]);
  });

  it('slides the table aside for the block handle instead of squeezing it frame by frame', async () => {
    const slides: string[] = [];
    const measure = Element.prototype.getBoundingClientRect;

    Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
      return new DOMRect(this.classList.contains('nui-editor__pushed') ? 30 : 0, 0, 300, 20);
    };

    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value: (frames: unknown) => {
        slides.push(JSON.stringify(frames));
      },
    });

    try {
      const { editor, table } = await shown();

      await table.hover();
      expect(editor.handleShown).toBe(true);
      await editor.hoverBlock(0);

      expect(slides).toEqual([
        '[{"translate":"-30px 0"},{"translate":"0 0"}]',
        '[{"translate":"30px 0"},{"translate":"0 0"}]',
      ]);
    } finally {
      Element.prototype.getBoundingClientRect = measure;
      Reflect.deleteProperty(Element.prototype, 'animate');
    }
  });

  it('turns a pasted sheet into a typed table', async () => {
    const { editor } = await shown();

    editor.focus();
    await editor.select(1);

    await editor.pasteHTML(
      '<table><tr><td>Name<td>Sum</tr><tr><td>Rent<td>1 200</tr><tr><td>Phone<td>45,5</tr></table>',
    );

    const pasted = editor.documents
      .at(-1)
      ?.root.content?.find((block) => 'type' in block && block.type === 'table');

    expect(JSON.stringify(pasted)).toContain('"name":"Sum","type":"number"');
    expect(JSON.stringify(pasted)).toContain('"value":45.5');
  });
});
