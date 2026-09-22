import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'explicit-css',
      async generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'LICENSE',
          source: await readFile(new URL('../../LICENSE', import.meta.url), 'utf8'),
        });
        this.emitFile({
          type: 'asset',
          fileName: 'styles.css',
          source: await readFile(new URL('./src/styles.css', import.meta.url), 'utf8'),
        });
      },
    },
  ],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    rolldownOptions: { external: ['vue'] },
  },
});
