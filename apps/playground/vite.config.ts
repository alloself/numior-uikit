import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: command === 'serve' ? { conditions: ['@numior/source'] } : {},
  build: {
    cssTarget: ['chrome123', 'firefox120', 'safari17.5'],
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        tailwind: fileURLToPath(new URL('./tailwind.html', import.meta.url)),
      },
    },
  },
}));
