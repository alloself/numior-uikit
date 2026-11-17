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
        table: fileURLToPath(new URL('./src/table/index.ts', import.meta.url)),
        code: fileURLToPath(new URL('./src/code/index.ts', import.meta.url)),
        media: fileURLToPath(new URL('./src/media/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [/^vue(?:\/server-renderer)?$/, /^@numior\/(editor-core|primitives|table|vue)$/],
    },
  },
});
