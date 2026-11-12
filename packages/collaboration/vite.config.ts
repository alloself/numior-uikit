import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
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
        'vue/index': fileURLToPath(new URL('./src/vue/index.ts', import.meta.url)),
        'spreadsheet/index': fileURLToPath(new URL('./src/spreadsheet/index.ts', import.meta.url)),
        'yjs/index': fileURLToPath(new URL('./src/yjs/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: {
      external: [/^vue$/, /^@numior\//, /^@vueuse\/core$/, /^yjs$/],
    },
    sourcemap: true,
  },
});
