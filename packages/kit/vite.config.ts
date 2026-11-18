import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { kitStyles } from '../../scripts/vite-kit-styles.ts';
import { packageAssets } from '../../scripts/vite-package-assets.ts';

const ENTRIES = [
  'index',
  'controls',
  'shiki',
  'address',
  'guards',
  'forms',
  'table/index',
  'table/engine',
  'spreadsheet/index',
  'spreadsheet/core',
  'spreadsheet/xlsx',
  'charts/index',
  'charts/core',
  'editor',
  'editor-core/index',
  'editor-core/view',
  'content/index',
  'content/table',
  'content/code',
  'content/media',
  'collaboration/index',
  'collaboration/vue',
  'collaboration/spreadsheet',
  'collaboration/yjs',
  'collaboration/room',
  'offline',
  'nuxt/module',
  'nuxt/runtime/plugin',
];

const source = (entry: string): string =>
  fileURLToPath(new URL(`./src/${entry}.ts`, import.meta.url));

export default defineConfig({
  plugins: [
    packageAssets({ root: new URL('./', import.meta.url) }),
    kitStyles({
      src: new URL('./src/', import.meta.url),
      packages: new URL('../', import.meta.url),
    }),
  ],
  build: {
    lib: {
      entry: Object.fromEntries(ENTRIES.map((entry) => [entry, source(entry)])),
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [/^@numior\//, /^@tailwindcss\//, /^nuxt\//, '#components', 'vue', /^node:/],
    },
  },
});
