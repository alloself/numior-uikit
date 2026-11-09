import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';
import { collabDevServer } from './collab-dev-server';

export default defineConfig(({ command }) => ({
  plugins: [vue(), tailwindcss(), collabDevServer()],
  resolve: command === 'serve' ? { conditions: ['@numior/source'] } : {},
  build: {
    cssTarget: ['chrome123', 'firefox125', 'safari17.5'],
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        bench: fileURLToPath(new URL('./bench.html', import.meta.url)),
        collab: fileURLToPath(new URL('./collab.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5200,
  },
}));
