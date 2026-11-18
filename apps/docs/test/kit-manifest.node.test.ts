import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import type { KitManifest } from '@numior/kit/vite';
import { kitManifest } from '../.vitepress/reference/kit-manifest';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const DIALOG = '@numior/kit/styles/dialog.css';

describe('manifest of the kit', () => {
  let manifest: KitManifest;

  beforeAll(() => {
    manifest = kitManifest(ROOT);
  }, 60_000);

  it('lists the components of every entry with the entry that exports them', () => {
    expect(manifest.components.NuiButton?.from).toBe('@numior/kit');
    expect(manifest.components.NuiTable?.from).toBe('@numior/kit/table');
    expect(manifest.components.NuiContentImage?.from).toBe('@numior/kit/content/media');
    expect(manifest.components.NuiContentImage?.styles).toContain(DIALOG);

    expect(manifest.components.NuiContentTable?.styles).toContain(
      '@numior/kit/table/styles/table.css',
    );
  });

  it('gives the styles of an export that renders components and leaves the others out', () => {
    expect(manifest.exports.contentMediaViews).toContain(DIALOG);
    expect(manifest.exports.editorBlocks).toContain('@numior/kit/editor/styles/blocks.css');
    expect(manifest.exports.useToast).toBeUndefined();
    expect(manifest.exports.NuiButton).toBeUndefined();
  });

  it('names only stylesheets of the kit order', () => {
    const order = new Set(manifest.order);

    const sheets = [
      ...Object.values(manifest.components).flatMap((component) => component.styles),
      ...Object.values(manifest.exports).flat(),
    ];

    expect(sheets.filter((sheet) => !order.has(sheet))).toEqual([]);
  });
});
