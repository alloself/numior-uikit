import vue from '@vitejs/plugin-vue';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: { conditions: ['@numior/source'] },
  ssr: { resolve: { conditions: ['@numior/source'] } },
  test: {
    server: { deps: { inline: [/^@numior\//] } },
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['packages/**/*.test.ts', 'apps/docs/test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, '**/*.node.test.ts'],
          setupFiles: ['./packages/vue/test/support/preload-icons.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['apps/docs/test/**/*.node.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      include: [
        'packages/{primitives,vue,forms}/src/**/*.{ts,vue}',
        'apps/docs/.vitepress/{examples,markdown,theme}/**/*.{ts,vue}',
      ],
      exclude: ['**/*.types.ts', '**/*.d.ts'],
    },
  },
});
