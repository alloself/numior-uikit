import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

// Headless primitives ship JavaScript and declarations only: no CSS, no Vue SFCs.
export default defineConfig({
  plugins: [
    {
      name: 'license',
      async generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'LICENSE',
          source: await readFile(new URL('../../LICENSE', import.meta.url), 'utf8'),
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
