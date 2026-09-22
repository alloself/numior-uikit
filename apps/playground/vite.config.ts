import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [vue(), tailwindcss()],
  // Production consumes dist, so browser checks exercise the package exports.
  resolve: command === 'serve' ? { conditions: ['@numior/source'] } : {},
  build: {
    // Keep light-dark(), oklch() and color-mix() native: the token contract targets these browsers.
    cssTarget: ['chrome123', 'firefox120', 'safari17.5'],
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        tailwind: fileURLToPath(new URL('./tailwind.html', import.meta.url)),
      },
    },
  },
}));
