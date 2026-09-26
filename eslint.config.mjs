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

const TEMPLATE_GLYPHS = [
  '(',
  ')',
  ',',
  '.',
  '&',
  '+',
  '-',
  '=',
  '*',
  '/',
  '#',
  '%',
  '!',
  '?',
  ':',
  '[',
  ']',
  '{',
  '}',
  '<',
  '>',
  '·',
  '•',
  '‐',
  '–',
  '—',
  '−',
  '|',
  '…',
];

const CATALOG_MESSAGE = 'User-facing texts live in *.messages.ts catalogs.';

const catalogTexts = {
  'no-restricted-syntax': [
    'error',
    {
      selector:
        "VariableDeclarator[init.callee.name='defineProps'] Property[key.name=/^(?:label|announce|[a-z][A-Za-z]*Label)$/] > AssignmentPattern:not([right.type='Identifier'][right.name='undefined'])",
      message: 'Text props default to undefined; the dictionary supplies the built-in text.',
    },
    {
      selector: 'Literal[value=/^[A-Z][a-z]+(?: [a-z]+)+$/]:not(NewExpression > Literal)',
      message: CATALOG_MESSAGE,
    },
    {
      selector:
        'TemplateElement[value.raw=/[A-Za-z]{2,} [a-z]{2,}/]:not(NewExpression > TemplateLiteral > TemplateElement)',
      message: CATALOG_MESSAGE,
    },
  ],
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.vitepress/cache/**',
      'playwright-report/**',
      'test-results/**',
      '.release/**',
    ],
  },
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
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.vue'],
    ignores: ['**/*.messages.ts'],
    rules: catalogTexts,
  },
  {
    files: ['packages/*/src/**/*.vue'],
    rules: {
      'vue/no-bare-strings-in-template': ['error', { allowlist: TEMPLATE_GLYPHS }],
    },
  },
];
