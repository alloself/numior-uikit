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

const RENDER_FUNCTIONS = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'vue',
          importNames: [
            'h',
            'defineComponent',
            'createVNode',
            'createElementVNode',
            'createTextVNode',
            'cloneVNode',
            'renderSlot',
            'renderList',
            'resolveComponent',
            'resolveDynamicComponent',
            'withCtx',
            'FunctionalComponent',
          ],
          message:
            'Components are SFCs; .archcore/component-authoring.rule.md lists the only exception.',
        },
      ],
    },
  ],
};

const CODE_SHAPE = [
  {
    selector:
      "CallExpression[callee.property.name=/^(?:map|flatMap|forEach|reduce|filter|some|every|find)$/][callee.object.callee.property.name='filter']",
    message: 'Build the result in one reduce instead of chaining filter with another pass.',
  },
  {
    selector: 'ForStatement[test=null]',
    message: 'A loop states its condition; no for (;;) with exits hidden in the body.',
  },
  {
    selector: 'WhileStatement[test.value=true], DoWhileStatement[test.value=true]',
    message: 'A loop states its condition; no while (true) with exits hidden in the body.',
  },
  {
    selector:
      "CallExpression[callee.property.name='forEach'][callee.object.type='ArrayExpression'][callee.object.elements.length=1][callee.object.elements.0.type='SpreadElement']",
    message:
      'Iterate the collection itself (for…of or its own forEach) instead of copying it first.',
  },
  {
    selector:
      'Program > :matches(VariableDeclaration, FunctionDeclaration, ClassDeclaration, ExpressionStatement, ExportDefaultDeclaration, ExportNamedDeclaration[declaration.type=/^(?:VariableDeclaration|FunctionDeclaration|ClassDeclaration)$/]) ~ :matches(TSInterfaceDeclaration, TSTypeAliasDeclaration, ExportNamedDeclaration[declaration.type=/^TS(?:Interface|TypeAlias)Declaration$/])',
    message: 'Types go to a *.types.ts module or to the top of the file, before any code.',
  },
];

const TIMERS = {
  selector: "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']",
  message: 'Wait with promiseTimeout, until or useIdle from @vueuse/core.',
};

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
    ...CODE_SHAPE,
  ],
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.vitepress/cache/**',
      '**/.nuxt/**',
      '**/.output/**',
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
    rules: {
      ...spacing,
      'vue/multi-word-component-names': ['error', { ignores: ['Example', 'Configurator'] }],
    },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.js', '**/*.mjs', '**/*.vue'],
    ignores: ['packages/content/src/content/content-nodes.ts'],
    rules: RENDER_FUNCTIONS,
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.js', '**/*.mjs', '**/*.vue'],
    rules: { 'no-restricted-syntax': ['error', ...CODE_SHAPE] },
  },
  {
    files: ['packages/{primitives,vue,table,editor-vue}/{src,test}/**/*.{ts,vue}'],
    ignores: ['packages/table/src/engine/**'],
    rules: { 'no-restricted-syntax': ['error', ...CODE_SHAPE, TIMERS] },
  },
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.vue'],
    ignores: ['**/*.messages.ts', 'packages/spreadsheet/src/xlsx/**'],
    rules: catalogTexts,
  },
  {
    files: ['packages/*/src/**/*.vue'],
    rules: {
      'vue/no-bare-strings-in-template': ['error', { allowlist: TEMPLATE_GLYPHS }],
    },
  },
];
