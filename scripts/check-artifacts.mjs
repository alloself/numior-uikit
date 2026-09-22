import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

for (const name of await readdir('packages')) {
  if (name === 'README.md') continue;
  const root = resolve('packages', name);
  const manifest = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
  assert.equal(
    typeof manifest.private,
    'boolean',
    `${name} must explicitly declare publication status`,
  );
  assert.equal(await readFile(`${root}/dist/LICENSE`, 'utf8'), await readFile('LICENSE', 'utf8'));
  for (const entry of Object.values(manifest.exports)) {
    const paths = typeof entry === 'string' ? [entry] : [entry.types, entry.import, entry.default];
    for (const path of paths.filter(Boolean)) {
      assert.ok((await readFile(resolve(root, path))).length, `Empty artifact: ${name}/${path}`);
    }
  }
}

// Import the actual ESM build without a DOM: this catches SSR-unsafe top-level code.
const { NuiButton } = await import(pathToFileURL(resolve('packages/vue/dist/index.js')).href);
assert.ok(NuiButton);
const code = await readFile('packages/vue/dist/index.js', 'utf8');
assert.doesNotMatch(code, /(?:tiptap|prosemirror|reka-ui|spreadsheet|tailwindcss)/i);
console.log('Package exports, CSS artifacts and DOM-free ESM import verified.');
