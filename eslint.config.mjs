import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';
import { guardFirst } from './scripts/eslint/guard-first.mjs';
import { testPhases } from './scripts/eslint/test-phases.mjs';

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
      "CallExpression[callee.property.name=/^(?:map|flatMap|forEach|reduce|filter|some|every|find|findIndex|findLast|findLastIndex|includes|indexOf|at|slice)$/][callee.object.callee.property.name='filter']",
    message: 'Build the result in one reduce instead of chaining filter with another pass.',
  },
  {
    selector:
      "MemberExpression:matches([property.name='length'], [computed=true])[object.callee.property.name='filter']",
    message: 'Count or pick in one pass instead of filtering into an array first.',
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

const LITERAL_COMPARISON =
  'Compare with a named constant of the enumeration (Key.Enter, Axis.X), not a string literal.';

const NAMED_ENUMERATIONS = [
  {
    selector:
      "BinaryExpression[operator=/^[!=]==?$/]:not([left.operator='typeof']):not([right.operator='typeof']):matches([left.value=/[^]/], [right.value=/[^]/])",
    message: LITERAL_COMPARISON,
  },
  {
    selector:
      "SwitchStatement:not([discriminant.operator='typeof']) > SwitchCase[test.value=/[^]/]",
    message: LITERAL_COMPARISON,
  },
];

const BOXES = {
  selector: "CallExpression[callee.property.name='boundingBox']",
  message: 'Read element boxes through boxOf or renderedWidth from tests/e2e/helpers/geometry.ts.',
};

const PAGE_OBJECTS = '/^(playground|docs|app)$/';

const SECTIONS = {
  selector: `VariableDeclarator[id.type='ObjectPattern']:matches([init.name=${PAGE_OBJECTS}], [init.object.name=${PAGE_OBJECTS}])`,
  message: 'Take sections and groups as fixtures destructured in the test parameters.',
};

const TIMERS = {
  selector: "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']",
  message: 'Wait with promiseTimeout, until or useIdle from @vueuse/core.',
};

const CATALOG_MESSAGE = 'User-facing texts live in *.messages.ts catalogs.';

const CATALOG = [
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
];

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
      'vue/no-restricted-static-attribute': [
        'error',
        { key: 'alias', element: 'NuiIcon', message: 'NuiIcon takes the alias through `icon`.' },
      ],
      'vue/no-restricted-v-bind': [
        'error',
        {
          argument: 'alias',
          element: 'NuiIcon',
          message: 'NuiIcon takes the alias through `icon`.',
        },
      ],
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
    files: ['tests/**/*.ts'],
    ignores: ['tests/e2e/helpers/geometry.ts'],
    rules: { 'no-restricted-syntax': ['error', ...CODE_SHAPE, BOXES, SECTIONS] },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.js', '**/*.mjs', '**/*.vue'],
    plugins: { numior: { rules: { 'guard-first': guardFirst, 'test-phases': testPhases } } },
    rules: { 'numior/guard-first': 'error' },
  },
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: { 'numior/test-phases': 'error' },
  },
  {
    files: ['packages/{primitives,vue,table,editor-vue}/{src,test}/**/*.{ts,vue}'],
    ignores: ['packages/table/src/engine/**'],
    rules: { 'no-restricted-syntax': ['error', ...CODE_SHAPE, TIMERS] },
  },
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.vue'],
    ignores: ['**/*.messages.ts', 'packages/spreadsheet/src/xlsx/**'],
    rules: { 'no-restricted-syntax': ['error', ...CATALOG, ...CODE_SHAPE] },
  },
  {
    files: ['packages/{primitives,vue,table,editor-vue}/src/**/*.{ts,vue}'],
    ignores: ['**/*.messages.ts', 'packages/table/src/engine/**'],
    rules: { 'no-restricted-syntax': ['error', ...CATALOG, ...CODE_SHAPE, TIMERS] },
  },
  {
    files: ['packages/{primitives,vue,table,editor-vue}/src/**/*.{ts,vue}'],
    ignores: ['**/*.messages.ts', 'packages/table/src/engine/**'],
    rules: {
      'no-restricted-syntax': ['error', ...CATALOG, ...CODE_SHAPE, TIMERS, ...NAMED_ENUMERATIONS],
    },
  },
  {
    files: [
      'packages/table/src/engine/**/*.ts',
      'packages/editor-core/src/**/*.ts',
      'packages/content/src/**/*.{ts,vue}',
      'packages/charts/src/**/*.{ts,vue}',
    ],
    ignores: ['**/*.messages.ts'],
    rules: { 'no-restricted-syntax': ['error', ...CATALOG, ...CODE_SHAPE, ...NAMED_ENUMERATIONS] },
  },
  {
    files: ['packages/forms/src/**/*.{ts,vue}'],
    ignores: ['**/*.messages.ts'],
    rules: { 'no-restricted-syntax': ['error', ...CATALOG, ...CODE_SHAPE, ...NAMED_ENUMERATIONS] },
  },
  {
    files: ['packages/spreadsheet/src/**/*.{ts,vue}'],
    ignores: ['**/*.messages.ts', 'packages/spreadsheet/src/xlsx/**'],
    rules: { 'no-restricted-syntax': ['error', ...CATALOG, ...CODE_SHAPE, ...NAMED_ENUMERATIONS] },
  },
  {
    files: ['packages/spreadsheet/src/xlsx/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...CODE_SHAPE, ...NAMED_ENUMERATIONS] },
  },
  {
    files: ['packages/*/src/**/*.vue'],
    rules: {
      'vue/no-bare-strings-in-template': ['error', { allowlist: TEMPLATE_GLYPHS }],
    },
  },
  {
    files: [
      'packages/{primitives,vue,forms,table,content,editor-vue,charts,spreadsheet}/src/**/*.vue',
    ],
    rules: { 'vue/no-restricted-syntax': ['error', ...NAMED_ENUMERATIONS] },
  },
];
