import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: command === 'serve' ? { conditions: ['@numior/source'] } : {},
  build: {
    cssTarget: ['chrome123', 'firefox120', 'safari17.5'],
  },
}));
