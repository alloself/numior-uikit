import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { kitStylesheets, type KitStylesheets } from '../.vitepress/reference/stylesheets';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

const fileOf = (path: string): string => join(ROOT, 'packages', path);

describe('stylesheets of the kit components', () => {
  let sheets: KitStylesheets;

  beforeAll(() => {
    sheets = kitStylesheets(ROOT);
  });

  it('orders the stylesheets of every package as its styles.css imports them', () => {
    expect(sheets.order.slice(0, 3)).toEqual([
      '@numior/vue/styles.css',
      '@numior/vue/styles/icon.css',
      '@numior/vue/styles/button.css',
    ]);

    expect(sheets.order.indexOf('@numior/vue/styles/select.css')).toBeLessThan(
      sheets.order.indexOf('@numior/forms/styles.css'),
    );
  });

  it('follows the parts a component imports, internal ones included, in the cascade order', () => {
    const select = sheets.of(fileOf('vue/src/select/NuiSelect.vue'));

    expect(select).toEqual(
      expect.arrayContaining([
        '@numior/vue/styles/field.css',
        '@numior/vue/styles/list.css',
        '@numior/vue/styles/row.css',
        '@numior/vue/styles/tree.css',
        '@numior/vue/styles/select.css',
      ]),
    );

    expect(select).toEqual(
      [...select].toSorted((a, b) => sheets.order.indexOf(a) - sheets.order.indexOf(b)),
    );
  });

  it('crosses packages and takes a component without own styles to the styles of its parts', () => {
    expect(sheets.of(fileOf('forms/src/components/form-field/NuiFormField.vue'))).toEqual([
      '@numior/vue/styles/field.css',
    ]);

    expect(sheets.of(fileOf('forms/src/components/form/NuiForm.vue'))).toEqual([
      '@numior/vue/styles/icon.css',
      '@numior/vue/styles/button.css',
      '@numior/vue/styles/alert.css',
      '@numior/forms/styles/form.css',
    ]);
  });

  it('adds the styles of a block that a template borrows by its class', () => {
    expect(sheets.of(fileOf('table/src/table/NuiTable.vue'))).toContain(
      '@numior/vue/styles/popover.css',
    );
  });

  it('gives the package styles when a part has no file of its own and drops the files they hold', () => {
    const editor = sheets.of(fileOf('editor-vue/src/editor/NuiEditor.vue'));

    expect(editor).toContain('@numior/editor-vue/styles.css');
    expect(editor.filter((path) => path.startsWith('@numior/editor-vue/styles/'))).toEqual([]);

    expect(sheets.of(fileOf('spreadsheet/src/sheet/NuiSpreadsheet.vue'))).toContain(
      '@numior/charts/styles/chart.css',
    );
  });

  it('names the file that defines each export of an entry, through imports it exports again', () => {
    const media = sheets.exports(fileOf('content/src/media/index.ts'));

    expect(media.get('NuiContentImage')).toBe(fileOf('content/src/media/NuiContentImage.vue'));
    expect(media.get('contentMediaViews')).toBe(fileOf('content/src/media/index.ts'));
    expect(media.has('NuiContentMessages')).toBe(false);
  });
});
