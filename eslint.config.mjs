import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';

const multiline = ['multiline-const', 'multiline-let', 'multiline-expression', 'function', 'class'];

const spacing = {
  '@stylistic/padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: '*', next: multiline },
    { blankLine: 'always', prev: multiline, next: '*' },
    { blankLine: 'always', prev: 'import', next: '*' },
    { blankLine: 'any', prev: 'import', next: 'import' },
    { blankLine: 'always', prev: '*', next: 'export' },
    { blankLine: 'any', prev: 'export', next: 'export' },
  ],
  '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
};

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.vitepress/cache/**'] },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    plugins: { '@stylistic': stylistic },
    languageOptions: { parserOptions: { parser: tsParser } },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/padding-line-between-blocks': 'error',
      ...spacing,
    },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.js', '**/*.mjs'],
    plugins: { '@stylistic': stylistic },
    languageOptions: { parser: tsParser },
    rules: spacing,
  },
];
