import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { packageAssets } from '../../scripts/vite-package-assets.ts';

export default defineConfig({
  plugins: [
    vue(),
    packageAssets({ root: new URL('./', import.meta.url), styles: './src/styles.css' }),
  ],
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        engine: fileURLToPath(new URL('./src/engine/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [/^vue$/, /^@numior\/(primitives|vue)$/, /^@vueuse\/core$/],
    },
  },
});
