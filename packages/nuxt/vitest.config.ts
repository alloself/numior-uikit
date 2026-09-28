import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'nuxt',
    environment: 'node',
    include: ['packages/nuxt/test/nuxt/**/*.test.ts'],
    hookTimeout: 240_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
