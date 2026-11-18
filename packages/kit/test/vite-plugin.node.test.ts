import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import { importKitComponents } from '../src/vite/components';
import { stylesheetPath, tailwindAlias } from '../src/vite/index';
import { parseManifest } from '../src/vite/manifest';
import { namesIn, projectSource, sourceFiles, sourcesIn } from '../src/vite/scan';
import { createStylesheet } from '../src/vite/stylesheet';
import { sheetImports, usedSheets } from '../src/vite/styles';
import { KNOWN, MANIFEST, SHEETS } from './harness/kit-manifest';

const projectWith = async (files: Readonly<Record<string, string>>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'numior-kit-'));

  onTestFinished(() => rm(root, { recursive: true, force: true }));

  for (const [file, text] of Object.entries(files)) {
    await mkdir(join(root, file, '..'), { recursive: true });
    await writeFile(join(root, file), text);
  }
  return root;
};

describe('@numior/kit/vite', () => {
  it('finds kit components by their PascalCase and kebab-case tags and leaves other names out', () => {
    const text = [
      '<NuiButton :variant="NuiButtonVariant.Soft" />',
      '<nui-badge>3</nui-badge>',
      '<div class="nui-table"><NuiNothing /></div>',
    ].join('\n');

    expect(namesIn(text, KNOWN)).toEqual(['NuiButton', 'NuiBadge']);
  });

  it('takes the names a script imports from the kit and leaves the same words elsewhere', () => {
    const text = [
      "import { contentMediaViews as media, type NuiContentViews } from '@numior/kit/content/media';",
      "import { contentMediaViews } from './local-views';",
      'const views = { ...media };',
    ].join('\n');

    expect(namesIn(text, KNOWN)).toEqual(['contentMediaViews']);
    expect(namesIn('const contentMediaViews = {};', KNOWN)).toEqual([]);
  });

  it('lists the sheets of the used components once, in the order of the kit', () => {
    expect(usedSheets(MANIFEST, ['NuiTable', 'NuiBadge', 'NuiButton'])).toEqual([
      SHEETS.ICON,
      SHEETS.BUTTON,
      SHEETS.BADGE,
      SHEETS.TABLE,
    ]);

    expect(usedSheets(MANIFEST, ['NuiBadge', 'NuiUnknown'])).toEqual([SHEETS.BADGE]);

    expect(usedSheets(MANIFEST, ['contentMediaViews', 'NuiBadge'])).toEqual([
      SHEETS.ICON,
      SHEETS.BUTTON,
      SHEETS.BADGE,
      SHEETS.DIALOG,
    ]);
  });

  it('writes one import per sheet', () => {
    expect(sheetImports([SHEETS.ICON, SHEETS.BUTTON])).toBe(
      `@import '${SHEETS.ICON}';\n@import '${SHEETS.BUTTON}';\n`,
    );

    expect(sheetImports([])).toBe('');
  });

  it('imports the kit components a compiled template resolves and leaves the rest to Vue', () => {
    const code = [
      'const a = _resolveComponent("NuiButton")',
      'const b = _resolveComponent("nui-badge")',
      'const c = _resolveComponent("NuiTable", true)',
      'const d = _resolveComponent("RouterLink")',
    ].join('\n');

    const output = importKitComponents(code, MANIFEST)?.toString() ?? '';

    expect(output.split('\n')).toEqual([
      "import { NuiButton as __nui_NuiButton, NuiBadge as __nui_NuiBadge } from '@numior/kit';",
      "import { NuiTable as __nui_NuiTable } from '@numior/kit/table';",
      'const a = __nui_NuiButton',
      'const b = __nui_NuiBadge',
      'const c = __nui_NuiTable',
      'const d = _resolveComponent("RouterLink")',
    ]);

    expect(
      importKitComponents('const d = _resolveComponent("RouterLink")', MANIFEST),
    ).toBeUndefined();
  });

  it('reads the files Tailwind reads and skips installed packages and ignored files', async () => {
    const root = await projectWith({
      '.gitignore': 'dist\n',
      'src/App.vue': '<NuiButton />',
      'dist/App.js': 'NuiTable',
      'node_modules/lib/index.js': 'NuiTable',
    });

    const files = sourceFiles([projectSource(root)]);

    expect(files.map((file) => file.slice(root.length + 1))).toEqual(
      expect.arrayContaining(['src/App.vue']),
    );

    expect(files.some((file) => file.includes('NuiTable'))).toBe(false);
    expect(files.some((file) => file.includes('/dist/'))).toBe(false);
    expect(files.some((file) => file.includes('/node_modules/'))).toBe(false);
  });

  it('writes the sheets of the components of the project and grows when a file adds one', async () => {
    const root = await projectWith({ 'src/App.vue': '<NuiBadge>3</NuiBadge>' });
    const sheet = createStylesheet(MANIFEST, root, join(root, '.vite/numior/styles.css'));

    await sheet.ready();

    expect(await readFile(sheet.path, 'utf8')).toBe(sheetImports([SHEETS.BADGE]));

    await writeFile(join(root, 'src/Orders.vue'), '<NuiTable />');

    expect(await sheet.grow(join(root, 'src/Orders.vue'))).toBe(true);
    expect(await sheet.grow(join(root, 'src/Orders.vue'))).toBe(false);
    expect(await sheet.grow(join(root, 'src/style.css'))).toBe(false);

    expect(await readFile(sheet.path, 'utf8')).toBe(
      sheetImports([SHEETS.ICON, SHEETS.BUTTON, SHEETS.BADGE, SHEETS.TABLE]),
    );
  });

  it('reads the @source lines of a Tailwind entry and leaves inline class lists out', () => {
    const css = [
      "@import 'tailwindcss';",
      '@source "../../shared";',
      "@source not '../../shared/legacy';",
      '@source inline("underline");',
    ].join('\n');

    expect(sourcesIn(css, '/app/src')).toEqual([
      { base: '/app/src', pattern: '../../shared', negated: false },
      { base: '/app/src', pattern: '../../shared/legacy', negated: true },
    ]);
  });

  it('adds the components of the folders a Tailwind entry names with @source', async () => {
    const root = await projectWith({
      'app/src/App.vue': '<NuiBadge>3</NuiBadge>',
      'shared/Orders.vue': '<NuiTable />',
      'shared/legacy/media.ts': "import { contentMediaViews } from '@numior/kit/content/media';",
    });

    const sheet = createStylesheet(MANIFEST, join(root, 'app'), join(root, 'app/.vite/styles.css'));

    const sources = sourcesIn(
      "@source '../../shared';\n@source not '../../shared/legacy';",
      join(root, 'app/src'),
    );

    await sheet.ready();

    expect(await readFile(sheet.path, 'utf8')).toBe(sheetImports([SHEETS.BADGE]));

    expect(await sheet.include(sources)).toBe(true);
    expect(await sheet.include(sources)).toBe(false);

    expect(await readFile(sheet.path, 'utf8')).toBe(
      sheetImports([SHEETS.ICON, SHEETS.BUTTON, SHEETS.BADGE, SHEETS.TABLE]),
    );
  });

  it('keeps the generated stylesheet in the cache folder of Vite', () => {
    expect(stylesheetPath({ root: '/app' })).toBe('/app/node_modules/.vite/numior/styles.css');

    expect(stylesheetPath({ root: '/app', cacheDir: '.cache' })).toBe(
      '/app/.cache/numior/styles.css',
    );
  });

  it('points the tailwindcss import at the Tailwind of the kit', () => {
    expect(tailwindAlias()).toEqual([
      { find: /^tailwindcss$/u, replacement: expect.stringMatching(/tailwindcss\/index\.css$/) },
    ]);
  });

  it('accepts a kit manifest and refuses anything else', () => {
    expect(parseManifest(JSON.stringify(MANIFEST))).toEqual(MANIFEST);
    expect(() => parseManifest('{"order":{}}')).toThrow('not a kit manifest');
  });
});
