import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { packageAssets } from '../../scripts/vite-package-assets.ts';

export default defineConfig({
  plugins: [packageAssets({ root: new URL('./', import.meta.url) })],
  build: {
    lib: {
      entry: {
        module: fileURLToPath(new URL('./src/module.ts', import.meta.url)),
        'runtime/plugin': fileURLToPath(new URL('./src/runtime/plugin.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [/^@nuxt\//, /^@numior\//, /^nuxt\//, '#components', 'vue', /^node:/],
    },
  },
});
