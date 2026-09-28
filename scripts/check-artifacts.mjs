import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
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
  'kitControls',
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
  'NuiTable',
  'NuiPagination',
  'NuiIcon',
  'NuiField',
  'NuiInput',
  'NuiTextarea',
  'NuiNumberField',
  'NuiTimeField',
  'NuiCalendar',
  'NuiDatePicker',
  'NuiDateRangePicker',
]);

assert.doesNotMatch(code, /(?:tiptap|prosemirror|reka-ui|spreadsheet|tailwindcss|vee-validate)/i);

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
]);

assert.match(formsCode, /from ['"]@numior\/vue['"]/, 'forms must keep @numior/vue external');

const formsTypes = (await readdir('packages/forms/dist', { recursive: true })).filter((file) =>
  file.endsWith('.d.ts'),
);

assert.ok(formsTypes.length > 0, 'forms must ship declarations');

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

const vueEntry = JSON.stringify(resolve('packages/vue/dist/index.js'));
const buttonOnly = await bundleOf(`export { NuiButton } from ${vueEntry};`);
const dialogOnly = await bundleOf(`export { NuiDialog } from ${vueEntry};`);

assert.doesNotMatch(
  buttonOnly,
  /Закрыть|Навигационная цепочка/,
  'NuiButton pulled dictionary texts',
);

assert.doesNotMatch(buttonOnly, /@vueuse\/core/, 'NuiButton pulled @vueuse/core');

assert.match(dialogOnly, /Закрыть/, 'NuiDialog lost its dictionary texts');

assert.doesNotMatch(
  dialogOnly,
  /Навигационная цепочка|Перетащите файлы/,
  'NuiDialog pulled other catalogs',
);

console.log('Package exports, CSS artifacts, DOM-free ESM imports and text tree-shaking verified.');
