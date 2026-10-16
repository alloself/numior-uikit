import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';
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
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [
        /^vue$/,
        /^@vueuse\/core$/,
        /^lucide-vue-next(\/|$)/,
        /^@numior\/(editor-core|content|primitives|table|vue)(\/[\w-]+)?$/,
      ],
    },
  },
});
