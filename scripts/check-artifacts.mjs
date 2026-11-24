import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { glob, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { compileScript, parse as parseSfc } from 'vue/compiler-sfc';

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

const DOCS_SITE = 'https://ui.numior.ru/';

const assertPackagePage = async (name, root, manifest) => {
  if (manifest.private) {
    return;
  }

  assert.ok(manifest.description?.trim(), `${name} must describe itself on its npm page`);
  assert.ok(manifest.keywords?.length > 0, `${name} must list keywords for npm search`);

  assert.ok(
    manifest.homepage?.startsWith(DOCS_SITE),
    `${name} must point its homepage at its page on ${DOCS_SITE}`,
  );

  assert.ok(existsSync(`${root}/README.md`), `${name} must ship a README for its npm page`);

  const readme = await readFile(`${root}/README.md`, 'utf8');

  assert.ok(readme.startsWith(`# ${manifest.name}\n`), `${name}/README.md must open with its name`);
  assert.ok(readme.includes(manifest.homepage), `${name}/README.md must link its docs page`);
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

  await assertPackagePage(name, root, manifest);

  assert.equal(await readFile(`${root}/dist/LICENSE`, 'utf8'), await readFile('LICENSE', 'utf8'));
  for (const [key, entry] of Object.entries(manifest.exports)) {
    assert.ok(
      typeof entry === 'object' && typeof entry['@numior/source'] === 'string',
      `${name} export ${key} must resolve to its sources under the @numior/source condition`,
    );

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
  'NuiStepperStep',
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

const spreadsheetCore = await import(
  pathToFileURL(resolve('packages/spreadsheet/dist/core/index.js')).href
);

assert.equal(
  typeof spreadsheetCore.createWorkbook,
  'function',
  'spreadsheet/core must export the workbook',
);

for (const file of await localImports(resolve('packages/spreadsheet/dist/core/index.js'))) {
  const source = await readFile(file, 'utf8');

  assert.doesNotMatch(
    source,
    /from ['"](?:vue|@vueuse\/[\w-]+|@numior\/[\w-]+|fflate)['"]/,
    `spreadsheet/core must stay free of Vue, UI packages and the zip codec: ${file}`,
  );

  assert.doesNotMatch(
    source,
    /\b(?:document|window|navigator)\.|\bResizeObserver\b/,
    `spreadsheet/core must not touch the DOM: ${file}`,
  );
}

const spreadsheetXlsx = await import(
  pathToFileURL(resolve('packages/spreadsheet/dist/xlsx/index.js')).href
);

assert.deepEqual(
  ['readZip', 'writeZip', 'createXmlParser', 'createXmlWriter'].map(
    (name) => typeof spreadsheetXlsx[name],
  ),
  ['function', 'function', 'function', 'function'],
  'spreadsheet/xlsx must export the zip codec and the XML reader and writer',
);

for (const file of await localImports(resolve('packages/spreadsheet/dist/xlsx/index.js'))) {
  const source = await readFile(file, 'utf8');

  assert.doesNotMatch(
    source,
    /from ['"](?:vue|@vueuse\/[\w-]+|@numior\/[\w-]+|fflate)['"]/,
    `spreadsheet/xlsx must stay free of Vue, UI packages and third-party zip code: ${file}`,
  );

  assert.doesNotMatch(
    source,
    /\b(?:document|window|navigator)\.|\bDOMParser\b/,
    `spreadsheet/xlsx must not touch the DOM: ${file}`,
  );
}

await importBuild('collaboration', ['collab', 'createCollabClient', 'webSocketTransport']);

const collaborationRoom = await import(
  pathToFileURL(resolve('packages/collaboration/dist/room/index.js')).href
);

for (const key of ['createRoom', 'editorAuthority', 'createLoopback', 'parseClientMessage']) {
  assert.ok(collaborationRoom[key], `collaboration/room must export ${key}`);
}

await importBuild('offline', ['openOfflineStore', 'deleteOfflineDocument']);

for (const file of await localImports(resolve('packages/offline/dist/index.js'))) {
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /from ['"](?:vue|@vueuse\/[\w-]+)['"]/,
    `offline must stay free of Vue: ${file}`,
  );
}

const collaborationVue = await import(
  pathToFileURL(resolve('packages/collaboration/dist/vue/index.js')).href
);

assert.equal(
  typeof collaborationVue.NuiCollabCarets,
  'object',
  'collaboration/vue must export the remote carets',
);

assert.equal(
  typeof collaborationVue.NuiEditorComments,
  'object',
  'collaboration/vue must export the comments panel',
);

assert.equal(
  typeof collaborationVue.NuiEditorHistory,
  'object',
  'collaboration/vue must export the version history panel',
);

for (const file of await localImports(resolve('packages/collaboration/dist/index.js'))) {
  assert.doesNotMatch(
    await readFile(file, 'utf8'),
    /from ['"](?:(?:vue|yjs|ws|@vueuse\/[\w-]+)['"]|@numior\/(?!editor-core['"/]))/,
    `collaboration must reach nothing but the editor core from its root entry: ${file}`,
  );
}

const collaborationPackage = JSON.parse(
  await readFile(resolve('packages/collaboration/package.json'), 'utf8'),
);

assert.deepEqual(
  Object.keys(collaborationPackage.dependencies),
  ['@numior/editor-core'],
  'collaboration must install nothing but the editor core; its Vue side lives on optional peers',
);

assert.deepEqual(
  Object.keys(collaborationPackage.peerDependencies).filter(
    (name) => collaborationPackage.peerDependenciesMeta?.[name]?.optional !== true,
  ),
  [],
  'every peer of collaboration must be optional: the root entry runs on a server without Vue',
);

const collaborationSpreadsheet = await import(
  pathToFileURL(resolve('packages/collaboration/dist/spreadsheet/index.js')).href
);

assert.equal(
  typeof collaborationSpreadsheet.useCollabWorkbook,
  'function',
  'collaboration/spreadsheet must export useCollabWorkbook',
);

const collaborationYjs = await import(
  pathToFileURL(resolve('packages/collaboration/dist/yjs/index.js')).href
);

assert.equal(
  typeof collaborationYjs.yjsBinding,
  'function',
  'collaboration/yjs must export yjsBinding',
);

await importBuild('charts', ['NuiChart', 'chartMessages']);
await importBuild('spreadsheet', ['NuiSpreadsheet', 'sheetCells']);

for (const file of await localImports(resolve('packages/spreadsheet/dist/index.js'))) {
  assert.doesNotMatch(
    file,
    /xlsx[\\/](?:zip[\\/]|read[\\/]read-workbook|write[\\/]write-workbook)/,
    `the spreadsheet base entry must load the XLSX engine on demand: ${file}`,
  );
}

const chartsCore = await import(pathToFileURL(resolve('packages/charts/dist/core/index.js')).href);

assert.equal(typeof chartsCore.layoutChart, 'function', 'charts/core must export the layout');

for (const file of await localImports(resolve('packages/charts/dist/core/index.js'))) {
  const source = await readFile(file, 'utf8');

  assert.doesNotMatch(
    source,
    /from ['"](?:vue|@vueuse\/[\w-]+|@numior\/[\w-]+)['"]/,
    `charts/core must stay free of Vue and UI packages: ${file}`,
  );

  assert.doesNotMatch(
    source,
    /\b(?:document|window|navigator)\./,
    `charts/core must not touch the DOM: ${file}`,
  );
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

assert.match(
  contentCode,
  /import\(['"]vue\/server-renderer['"]\)/,
  'content must load vue/server-renderer from the app on demand',
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
    /from ['"]@numior\/table['"]/,
    `content must leave the table view to its table entry: ${file}`,
  );
}

const contentTable = await readFile('packages/content/dist/table.js', 'utf8');

assert.match(
  contentTable,
  /from ['"]@numior\/table['"]/,
  'content/table must keep @numior/table external',
);

const contentCodeView = await readFile('packages/content/dist/code.js', 'utf8');

assert.match(
  contentCodeView,
  /from ['"]@numior\/vue['"]/,
  'content/code must keep @numior/vue external',
);

const contentMediaView = await readFile('packages/content/dist/media.js', 'utf8');

assert.match(
  contentMediaView,
  /from ['"]@numior\/vue['"]/,
  'content/media must keep @numior/vue external',
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

const nuxtModule = await import(pathToFileURL(resolve('packages/kit/dist/nuxt/module.js')).href);

assert.equal(typeof nuxtModule.default, 'function', 'nuxt must export the module');

const nuxtPlugin = await readFile('packages/kit/dist/nuxt/runtime/plugin.js', 'utf8');

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

const mcpModule = await import(pathToFileURL(resolve('packages/mcp/dist/index.js')).href);

for (const key of ['createNumiorServer', 'checkUsage', 'parseData']) {
  assert.equal(typeof mcpModule[key], 'function', `mcp must export ${key}`);
}

const mcpMain = await readFile('packages/mcp/dist/main.js', 'utf8');

assert.match(mcpMain, /^#!\/usr\/bin\/env node\n/, 'the mcp binary must start with a node shebang');

const mcpData = mcpModule.parseData(await readFile('packages/mcp/dist/data.json', 'utf8'));

assert.ok(
  Object.keys(mcpData.components).length > 50,
  'the mcp data must hold the component reference',
);

assert.equal(
  mcpData.pages.en.length,
  mcpData.pages.ru.length,
  'the mcp data must hold both page copies',
);

assert.ok(
  Object.keys(mcpData.examples.en).length > 100,
  'the mcp data must hold the example sources',
);

const mcpChunks = [];

for await (const file of glob('packages/mcp/dist/*.js')) {
  mcpChunks.push(await readFile(file, 'utf8'));
}

for (const external of [
  '@modelcontextprotocol/sdk/server/mcp.js',
  '@vue/compiler-sfc',
  'postcss',
  'postcss-selector-parser',
  'minisearch',
  'zod',
]) {
  assert.ok(
    mcpChunks.some((chunk) => chunk.includes(`from "${external}"`)),
    `the mcp build must keep ${external} external`,
  );
}

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
        external: [
          /^vue$/,
          /^@numior\/primitives$/,
          /^@lucide\/vue$/,
          /^@vueuse\/core$/,
          /^shiki$/,
        ],
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

const LAZY_SHIKI = /import\(['"]shiki['"]\)/;

const shikiFiles = [];

for (const name of await readdir('packages/primitives/dist')) {
  if (!name.startsWith('shiki') || !name.endsWith('.js')) {
    continue;
  }

  shikiFiles.push(await readFile(`packages/primitives/dist/${name}`, 'utf8'));
}

assert.ok(
  shikiFiles.some((chunk) => LAZY_SHIKI.test(chunk)),
  'primitives/shiki must load shiki lazily',
);

for (const chunk of shikiFiles) {
  assert.doesNotMatch(
    chunk,
    /^import[^;]*['"]shiki['"]/m,
    'primitives/shiki must not import shiki eagerly',
  );
}

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

const primitivesEntry = JSON.stringify(resolve('packages/primitives/dist/index.js'));

assert.doesNotMatch(
  await bundleOf(`export { useClipboard } from ${primitivesEntry};`),
  LAZY_SHIKI,
  'useClipboard pulled the built-in highlighter',
);

assert.match(
  await bundleOf(`export { useHighlighter } from ${primitivesEntry};`),
  LAZY_SHIKI,
  'useHighlighter lost the built-in highlighter',
);

assert.match(dialogOnly, /Закрыть/, 'NuiDialog lost its dictionary texts');

assert.doesNotMatch(
  dialogOnly,
  /Навигационная цепочка|Перетащите файлы/,
  'NuiDialog pulled other catalogs',
);

const withoutUndefined = (text) =>
  text
    .replace(/\s*(?<!\|)\|\s*undefined\b(?!\s*\|)/g, '')
    .replace(/\bundefined\s*\|(?!\|)\s*/g, '');

const typeSources = {
  fileExists: (file) => existsSync(file),
  readFile: (file) => (existsSync(file) ? withoutUndefined(readFileSync(file, 'utf8')) : undefined),
  realpath: (file) => realpathSync(file),
};

const NARROWED_PROP = /(\w+): \{ type: ([^}]*?), (?:required: \w+, )?skipCheck: true/g;

const narrowedProps = async () => {
  const found = [];

  for await (const file of glob('packages/*/src/**/*.vue')) {
    const source = withoutUndefined(await readFile(file, 'utf8'));
    const { descriptor } = parseSfc(source, { filename: resolve(file) });

    if (!descriptor.scriptSetup) {
      continue;
    }

    const { content } = compileScript(descriptor, { id: file, isProd: false, fs: typeSources });

    for (const [, prop, type] of content.matchAll(NARROWED_PROP)) {
      found.push(`${file} ${prop}: ${type}`);
    }
  }
  return found;
};

assert.deepEqual(
  await narrowedProps(),
  [],
  'A prop that mixes a boolean or a function with a type the SFC compiler cannot resolve keeps only Boolean or Function in the build, so a development runtime warns on its valid values',
);

const KIT = resolve('packages/kit');

const packageTarget = (specifier, condition) => {
  const [, name = '', rest = ''] = /^@numior\/([a-z-]+)(\/.*)?$/u.exec(specifier) ?? [];
  const root = resolve('packages', name);
  const { exports } = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'));
  const subpath = `.${rest}`;

  const [key, entry] =
    Object.entries(exports).find(([pattern]) => {
      const [prefix, suffix = ''] = pattern.split('*');

      return pattern.includes('*')
        ? subpath.startsWith(prefix) && subpath.endsWith(suffix)
        : pattern === subpath;
    }) ?? [];

  assert.ok(entry, `${specifier} is not exported by @numior/${name}`);

  const [prefix, suffix = ''] = key.split('*');

  const star = key.includes('*')
    ? subpath.slice(prefix.length, subpath.length - suffix.length)
    : '';

  return resolve(root, entry[condition].replace('*', star));
};

const REEXPORTS = /^(?:export \* from '@numior\/[a-z/-]+';\n)+$/u;

const forwardedSpecifiers = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/(?:from|@import) '([^']+)'/gu)].map((match) => match[1]);

const kitManifest = JSON.parse(readFileSync(`${KIT}/package.json`, 'utf8'));

for (const [key, entry] of Object.entries(kitManifest.exports)) {
  if (
    entry.import === undefined ||
    !REEXPORTS.test(readFileSync(resolve(KIT, entry['@numior/source']), 'utf8'))
  ) {
    continue;
  }

  const kitModule = await import(pathToFileURL(resolve(KIT, entry.import)).href);

  const sources = await Promise.all(
    forwardedSpecifiers(resolve(KIT, entry['@numior/source'])).map(
      (specifier) => import(pathToFileURL(packageTarget(specifier, 'import')).href),
    ),
  );

  const expected = Object.assign({}, ...sources);

  assert.deepEqual(
    Object.keys(kitModule).toSorted(),
    Object.keys(expected).toSorted(),
    `@numior/kit${key.slice(1)} must export what its packages export`,
  );

  for (const name of Object.keys(expected)) {
    assert.equal(kitModule[name], expected[name], `@numior/kit${key.slice(1)} must share ${name}`);
  }
}

for (const entry of Object.values(kitManifest.exports)) {
  if (entry.default === undefined) {
    continue;
  }

  for (const path of await artifactPaths(KIT, entry.default)) {
    for (const specifier of forwardedSpecifiers(resolve(KIT, path))) {
      assert.ok(
        existsSync(packageTarget(specifier, 'default')),
        `@numior/kit/${path.replace(/^\.\/dist\//u, '')} forwards to a missing ${specifier}`,
      );
    }
  }
}

console.log(
  'Package exports, CSS artifacts, DOM-free ESM imports, text tree-shaking, prop runtime types and the kit entries verified.',
);
