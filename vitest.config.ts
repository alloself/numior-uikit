import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: { conditions: ['@numior/source'] },
  ssr: { resolve: { conditions: ['@numior/source'] } },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts'],
    setupFiles: ['./packages/vue/test/support/preload-icons.ts'],
    server: { deps: { inline: [/^@numior\//] } },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      include: ['packages/{primitives,vue,forms}/src/**/*.{ts,vue}'],
      exclude: ['**/*.types.ts', '**/*.d.ts'],
    },
  },
});
