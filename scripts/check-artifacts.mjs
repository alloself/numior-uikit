import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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
  'useFloating',
  'usePopover',
  'useDialog',
  'useColorScheme',
  'createToastStore',
  'useToast',
  'useListNavigation',
]);
const code = await importBuild('vue', [
  'NuiButton',
  'NuiLink',
  'NuiMenu',
  'NuiTabs',
  'NuiBreadcrumbs',
  'NuiSelect',
  'NuiCombobox',
  'NuiChip',
  'NuiBadge',
  'NuiPagination',
  'NuiIcon',
  'NuiConfigProvider',
  'NuiField',
  'NuiInput',
  'NuiTextarea',
]);
assert.doesNotMatch(code, /(?:tiptap|prosemirror|reka-ui|spreadsheet|tailwindcss)/i);
console.log('Package exports, CSS artifacts and DOM-free ESM imports verified.');
