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
        controls: fileURLToPath(new URL('./src/controls/index.ts', import.meta.url)),
        shiki: fileURLToPath(new URL('./src/shiki/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [
        /^vue$/,
        /^@numior\/primitives$/,
        /^lucide-vue-next(\/|$)/,
        /^@vueuse\/core$/,
        /^shiki(\/|$)/,
      ],
      output: { chunkFileNames: 'shared-[hash].js' },
    },
  },
});
