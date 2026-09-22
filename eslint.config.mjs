import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';

// Oxlint owns JS/TS rules; ESLint covers the Vue template gap.
export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.vitepress/cache/**'] },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tsParser } },
    rules: { 'vue/multi-word-component-names': 'off' },
  },
];
