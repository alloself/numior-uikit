import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { packageAssets } from '../../scripts/vite-package-assets.ts';

export default defineConfig({
  plugins: [packageAssets({ root: new URL('./', import.meta.url) })],
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        guards: fileURLToPath(new URL('./src/guards/guards.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: { external: ['vue', '@floating-ui/dom', '@vueuse/core'] },
  },
});
