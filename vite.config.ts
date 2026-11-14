import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { configDefaults, defineConfig } from 'vite-plus';
import { docsDemo } from './apps/docs/.vitepress/examples/demo.ts';

export default defineConfig({
  plugins: [vue(), docsDemo(fileURLToPath(new URL('./apps/docs/demo', import.meta.url)))],
  resolve: { conditions: ['@numior/source'] },
  ssr: { resolve: { conditions: ['@numior/source'] } },
  test: {
    server: { deps: { inline: [/^@numior\//] } },
    tags: [
      {
        name: 'budget',
        description:
          'Holds a time budget: runs uninstrumented in test:budget, left out of coverage.',
      },
    ],
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          testTimeout: 15_000,
          include: ['packages/**/*.test.ts', 'apps/docs/test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, '**/*.node.test.ts', 'packages/nuxt/test/nuxt/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'apps/docs/test/**/*.node.test.ts',
            'packages/**/*.node.test.ts',
            'scripts/eslint/*.node.test.mjs',
          ],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      reportsDirectory: 'node_modules/.cache/coverage',
      clean: false,
      include: [
        'packages/{primitives,vue,forms,table,editor-core,content,editor-vue,spreadsheet,charts,collaboration,offline,mcp}/src/**/*.{ts,vue}',
        'apps/docs/.vitepress/{content,examples,markdown,reference,theme}/**/*.{ts,vue}',
        'scripts/eslint/*.mjs',
      ],
      exclude: ['**/*.types.ts', '**/*.d.ts', '**/*.test.mjs'],
    },
  },
  fmt: {
    semi: true,
    singleQuote: true,
    printWidth: 100,
    ignorePatterns: [
      'pnpm-lock.yaml',
      '.archcore/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vitepress/cache/**',
      'playwright-report/**',
      'test-results/**',
      '.release/**',
      '**/.nuxt/**',
      '**/.output/**',
      'tests/e2e/fixtures/paste/**',
      'packages/spreadsheet/test/corpus/xlsx/**',
    ],
  },
  lint: {
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'vue', 'vitest', 'promise'],
    categories: {
      correctness: 'error',
      suspicious: 'error',
    },
    env: {
      builtin: true,
    },
    ignorePatterns: [
      '**/dist/**',
      '**/coverage/**',
      '**/.vitepress/cache/**',
      'playwright-report/**',
      'test-results/**',
      '.release/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/node_modules/**',
    ],
    rules: {
      'no-debugger': 'error',
      eqeqeq: 'error',
      curly: ['error', 'all'],
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'import/no-unassigned-import': [
        'error',
        {
          allow: ['**/*.css'],
        },
      ],
      'vite-plus/prefer-vite-plus-imports': 'error',
      'typescript/consistent-return': 'off',
    },
    overrides: [
      {
        files: ['packages/table/src/engine/rank-host.ts'],
        rules: {
          'import/default': 'off',
        },
      },
      {
        files: ['packages/offline/src/persistence/ownership.ts'],
        rules: {
          'unicorn/require-post-message-target-origin': 'off',
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  run: {
    tasks: {
      typecheck: {
        command: 'node scripts/vue-declarations.ts',
        cache: {
          input: [{ auto: true }, '!node_modules/.cache/vue-dts/**'],
          output: ['node_modules/.cache/vue-dts/**'],
        },
      },
      'test:budget': {
        command: 'vp test run --tags-filter=budget',
        cache: {
          untrackedEnv: ['VITEST_MAX_WORKERS'],
        },
      },
      'test:coverage': {
        command: 'vp test run --coverage --tags-filter=!budget',
        cache: {
          untrackedEnv: ['VITEST_MAX_WORKERS'],
          input: [{ auto: true }, '!node_modules/.cache/coverage/**'],
          output: ['node_modules/.cache/coverage/coverage-final.json'],
        },
      },
    },
  },
});
