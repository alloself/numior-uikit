import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const artifactPaths = async (root, target) => {
  if (!target.includes('*')) {
    return [target];
  }
  const [prefix, suffix] = target.split('*');
  const slash = prefix.lastIndexOf('/');
  const dir = prefix.slice(0, slash + 1);
  const start = prefix.slice(slash + 1);

  const names = (await readdir(resolve(root, dir))).filter(
    (name) => name.startsWith(start) && name.endsWith(suffix),
  );

  assert.ok(names.length > 0, `No artifacts match ${target}`);
  return names.map((name) => `${dir}${name}`);
};

for (const name of await readdir('packages')) {
  if (name === 'README.md') {
    continue;
  }
  const root = resolve('packages', name);
  const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));

  assert.equal(
    typeof manifest.private,
    'boolean',
    `${name} must explicitly declare publication status`,
  );

  assert.equal(await readFile(`${root}/dist/LICENSE`, 'utf8'), await readFile('LICENSE', 'utf8'));
  for (const entry of Object.values(manifest.exports)) {
    const targets =
      typeof entry === 'string' ? [entry] : [entry.types, entry.import, entry.default];

    for (const target of targets.filter(Boolean)) {
      for (const path of await artifactPaths(root, target)) {
        assert.ok((await readFile(resolve(root, path))).length, `Empty artifact: ${name}/${path}`);
      }
    }
  }
}

const importBuild = async (name, expectedExports) => {
  const file = resolve(`packages/${name}/dist/index.js`);
  const module = await import(pathToFileURL(file).href);
  for (const key of expectedExports) {
    assert.ok(module[key], `${name} must export ${key}`);
  }
  return readFile(file, 'utf8');
};

await importBuild('primitives', [
  'provideField',
  'useFieldControl',
  'provideIcons',
  'useLocale',
  'useMessages',
  'plural',
  'useDirection',
  'monthGrid',
  'parseDateText',
  'useFloating',
  'usePopover',
  'useDialog',
  'useColorScheme',
  'createToastStore',
  'useToast',
  'useListNavigation',
  'useVirtualList',
  'useVirtualFrame',
  'createSizeIndex',
  'useReorder',
  'useUploadQueue',
  'useMediaQuery',
  'useBlockSizeTween',
  'useClipboard',
  'useHotkey',
  'useScrollSpy',
  'colorSchemeScript',
  'shapeOf',
]);

const code = await importBuild('vue', [
  'NuiAvatarUpload',
  'NuiButton',
  'NuiLink',
  'NuiSeparator',
  'NuiKbd',
  'NuiCode',
  'NuiToggleGroup',
  'NuiCollapsible',
  'NuiAccordion',
  'NuiAccordionItem',
  'NuiCommand',
  'NuiCommandDialog',
  'NuiToc',
  'NuiSkipLink',
  'NuiSplitter',
  'NuiMenu',
  'NuiTabs',
  'NuiBreadcrumbs',
  'NuiStepper',
  'NuiSelect',
  'NuiCombobox',
  'NuiChip',
  'NuiBadge',
  'NuiAvatar',
  'NuiEmpty',
  'NuiCard',
  'NuiList',
  'NuiTree',
  'NuiPagination',
  'NuiIcon',
  'NuiField',
  'NuiInput',
  'NuiTextarea',
  'NuiNumberField',
  'NuiTimeField',
  'NuiOtpField',
  'NuiCalendar',
  'NuiDatePicker',
  'NuiDateRangePicker',
]);

assert.doesNotMatch(code, /(?:tiptap|prosemirror|reka-ui|spreadsheet|tailwindcss|vee-validate)/i);
assert.doesNotMatch(code, /['"]shiki['"]/, 'the vue base bundle must not import shiki');

const formsCode = await importBuild('forms', [
  'NuiForm',
  'NuiFormField',
  'NuiFieldArray',
  'NuiSmartForm',
  'formConfig',
  'useForm',
  'useField',
  'useFieldArray',
  'provideForm',
  'useFormContext',
  'FORM_KEY',
  'NuiFormError',
  'required',
  'min',
  'max',
  'email',
  'pattern',
  'custom',
  'customAsync',
  'runRules',
  'formRulesMessages',
]);

assert.match(formsCode, /from ['"]@numior\/vue['"]/, 'forms must keep @numior/vue external');

const formsTypes = (await readdir('packages/forms/dist', { recursive: true })).filter((file) =>
  file.endsWith('.d.ts'),
);

assert.ok(formsTypes.length > 0, 'forms must ship declarations');

const localImports = async (file, seen = new Set()) => {
  if (seen.has(file)) {
    return seen;
  }
  seen.add(file);

  for (const [, specifier] of (await readFile(file, 'utf8')).matchAll(
    /from ['"](\.{1,2}\/[^'"]+)['"]/g,
  )) {
    await localImports(resolve(dirname(file), specifier), seen);
  }
  return seen;
};

const tableCode = await importBuild('table', ['NuiTable', 'tableEditor', 'tableCells']);

assert.match(tableCode, /from ['"]@numior\/vue['"]/, 'table must keep @numior/vue external');
assert.doesNotMatch(tableCode, /formRulesMessages\s*=/, 'table must keep @numior/forms external');

const tableEngineFile = resolve('packages/table/dist/engine/index.js');
const tableEngine = await import(pathToFileURL(tableEngineFile).href);

assert.equal(
  typeof tableEngine.createTableEngine,
  'function',
  'table/engine must export the engine',
);

for (const file of await localImports(tableEngineFile)) {
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /from ['"](?:vue|@vueuse\/[\w-]+|@numior\/[\w-]+)['"]/,
    `the table engine must stay free of Vue and UI packages: ${file}`,
  );
}

await importBuild('editor-core', ['createSchema', 'createDoc', 'createIdSource']);

const editorFixtures = await import(
  pathToFileURL(resolve('packages/editor-core/dist/fixtures.js')).href
);

assert.equal(
  typeof editorFixtures.generateDoc,
  'function',
  'editor-core/fixtures must export the document generator',
);

const editorView = await import(pathToFileURL(resolve('packages/editor-core/dist/view.js')).href);

assert.equal(
  typeof editorView.createEditorView,
  'function',
  'editor-core/view must export the editor view',
);

for (const entry of ['index.js', 'fixtures.js', 'view.js']) {
  for (const file of await localImports(resolve('packages/editor-core/dist', entry))) {
    assert.doesNotMatch(
      await readFile(file, 'utf8'),
      /from ['"](?:vue|@vueuse\/[\w-]+|@numior\/[\w-]+)['"]/,
      `editor-core must stay free of Vue and UI packages: ${file}`,
    );
  }
}

for (const entry of ['index.js', 'fixtures.js']) {
  for (const file of await localImports(resolve('packages/editor-core/dist', entry))) {
    assert.doesNotMatch(
      await readFile(file, 'utf8'),
      /\b(?:document|window|navigator|Node)\.|\bResizeObserver\b/,
      `editor-core must not touch the DOM outside its view entry: ${file}`,
    );
  }
}

const contentCode = await importBuild('content', [
  'NuiContent',
  'contentSchema',
  'extendContentSchema',
  'renderContent',
]);

assert.match(
  contentCode,
  /from ['"]@numior\/editor-core['"]/,
  'content must keep @numior/editor-core external',
);

for (const file of await localImports(resolve('packages/content/dist/index.js'))) {
  const bundle = await readFile(file, 'utf8');

  assert.doesNotMatch(
    bundle,
    /beforeinput|compositionstart|MutationObserver/,
    `content must not carry the editing runtime: ${file}`,
  );

  assert.doesNotMatch(
    bundle,
    /from ['"]@numior\/editor-core\/view['"]/,
    `content must not import the editor view: ${file}`,
  );
}

for (const file of await localImports(resolve('packages/content/dist/index.js'))) {
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /from ['"]@numior\/(?:table|vue)['"]/,
    `content must leave the table view to its table entry: ${file}`,
  );
}

const contentTable = await readFile('packages/content/dist/table.js', 'utf8');

assert.match(
  contentTable,
  /from ['"]@numior\/table['"]/,
  'content/table must keep @numior/table external',
);

const editorVueCode = await importBuild('editor-vue', [
  'NuiEditor',
  'defineBlock',
  'defineBlockState',
]);

for (const external of [
  'vue',
  '@numior/editor-core',
  '@numior/editor-core/view',
  '@numior/content',
]) {
  assert.match(
    editorVueCode,
    new RegExp(`from ['"]${external.replaceAll('/', '\\/')}['"]`),
    `editor-vue must keep ${external} external`,
  );
}

assert.doesNotMatch(
  editorVueCode,
  /from ['"]@numior\/(?:table|content\/table)['"]/,
  'editor-vue must load the table block on demand',
);

assert.match(
  editorVueCode,
  /import\(['"]\.\/[^'"]*NuiEditorTable[^'"]*['"]\)/,
  'editor-vue must split the table block into its own chunk',
);

for (const name of await readdir('packages')) {
  const dist = resolve('packages', name, 'dist');

  const declarations = existsSync(dist)
    ? (await readdir(dist, { recursive: true })).filter((file) => file.endsWith('.d.ts'))
    : [];

  for (const file of declarations) {
    const path = resolve(dist, file);

    for (const [, specifier] of (await readFile(path, 'utf8')).matchAll(
      /from ['"](\.{1,2}\/[^'"]+)['"]/g,
    )) {
      const target = resolve(dirname(path), specifier);

      assert.ok(
        !existsSync(`${target}.js`) || existsSync(`${target}.d.ts`),
        `${name}: ${file} imports ${specifier}, which resolves to a bundle without types`,
      );
    }
  }
}

const nuxtModule = await import(pathToFileURL(resolve('packages/nuxt/dist/module.js')).href);

assert.equal(typeof nuxtModule.default, 'function', 'nuxt must export the module');

const nuxtPlugin = await readFile('packages/nuxt/dist/runtime/plugin.js', 'utf8');

assert.match(nuxtPlugin, /from ['"]nuxt\/app['"]/, 'the nuxt plugin must keep nuxt/app external');

assert.match(
  nuxtPlugin,
  /from ['"]#components['"]/,
  'the nuxt plugin must take NuxtLink from #components',
);

assert.match(
  nuxtPlugin,
  /from ['"]@numior\/vue['"]/,
  'the nuxt plugin must keep @numior/vue external',
);

assert.doesNotMatch(nuxtPlugin, /\.css['"]/, 'the nuxt plugin must not import css');

const PROBE = '\0nui-probe';

const bundleOf = async (source) => {
  const results = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      rolldownOptions: {
        input: 'nui-probe',
        preserveEntrySignatures: 'strict',
        treeshake: { moduleSideEffects: 'no-external' },
        external: [/^vue$/, /^@numior\/primitives$/, /^lucide-vue-next(\/|$)/, /^@vueuse\/core$/],
      },
    },
    plugins: [
      {
        name: 'nui-probe',
        resolveId: (id) => (id === 'nui-probe' ? PROBE : undefined),
        load: (id) => (id === PROBE ? source : undefined),
      },
    ],
  });

  return [results]
    .flat()
    .flatMap((result) => result.output)
    .map((chunk) => (chunk.type === 'chunk' ? chunk.code : ''))
    .join('\n');
};

const vueControls = await import(pathToFileURL(resolve('packages/vue/dist/controls.js')).href);

assert.equal(typeof vueControls.kitControls, 'object', 'vue/controls must export the kit controls');

const vueShiki = await readFile('packages/vue/dist/shiki.js', 'utf8');

assert.match(vueShiki, /import\(['"]shiki['"]\)/, 'vue/shiki must load shiki lazily');

assert.doesNotMatch(
  vueShiki,
  /^import[^;]*['"]shiki['"]/m,
  'vue/shiki must not import shiki eagerly',
);

const vueEntry = JSON.stringify(resolve('packages/vue/dist/index.js'));
const buttonOnly = await bundleOf(`export { NuiButton } from ${vueEntry};`);
const dialogOnly = await bundleOf(`export { NuiDialog } from ${vueEntry};`);

assert.doesNotMatch(
  buttonOnly,
  /Закрыть|Навигационная цепочка/,
  'NuiButton pulled dictionary texts',
);

assert.doesNotMatch(buttonOnly, /@vueuse\/core/, 'NuiButton pulled @vueuse/core');

assert.doesNotMatch(buttonOnly, /NuiTimeField|NuiDatePicker/, 'NuiButton pulled the kit controls');

assert.match(dialogOnly, /Закрыть/, 'NuiDialog lost its dictionary texts');

assert.doesNotMatch(
  dialogOnly,
  /Навигационная цепочка|Перетащите файлы/,
  'NuiDialog pulled other catalogs',
);

console.log('Package exports, CSS artifacts, DOM-free ESM imports and text tree-shaking verified.');
