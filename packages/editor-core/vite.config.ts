import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { packageAssets } from '../../scripts/vite-package-assets.ts';

export default defineConfig({
  plugins: [packageAssets({ root: new URL('./', import.meta.url) })],
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        fixtures: fileURLToPath(new URL('./src/fixtures/index.ts', import.meta.url)),
        view: fileURLToPath(new URL('./src/view/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: {
      external: [/^lodash-es(\/|$)/],
    },
    sourcemap: true,
  },
});
