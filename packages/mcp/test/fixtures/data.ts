import type { McpComponent, McpData, McpPage } from '../../src/data.types';

const text = (en: string, ru: string) => ({ en, ru });

export const fixtureButton: McpComponent = {
  name: 'NuiButton',
  package: '@numior/kit',
  styles: {
    import: '@numior/kit/styles/button.css',
    blocks: [
      { name: 'nui-button', parts: ['content', 'spinner'], modifiers: ['loading', 'variant-soft'] },
    ],
    tokens: ['--nui-control-height-md', '--nui-primary', '--nui-radius', '--nui-radius-full'],
  },
  stylesheets: ['@numior/kit/styles/button.css'],
  props: [
    {
      name: 'variant',
      type: 'NuiButtonVariant',
      kind: 'enum',
      required: false,
      default: '"solid"',
      values: ['solid', 'soft', 'outline'],
      description: text('Look of the button.', 'Оформление кнопки.'),
    },
    {
      name: 'tone',
      type: 'NuiTone',
      kind: 'enum',
      required: false,
      default: '"primary"',
      values: ['primary', 'error'],
      description: text('Color of the button.', 'Цвет кнопки.'),
    },
    {
      name: 'icon',
      type: 'IconSource',
      kind: 'enum',
      required: false,
      values: ['check', 'trash'],
    },
    {
      name: 'iconOnly',
      type: 'boolean',
      kind: 'boolean',
      required: false,
    },
  ],
  models: [],
  events: [],
  slots: [{ name: 'default', type: '{}', description: text('Label.', 'Подпись.') }],
  exposed: [],
  keyboard: [{ keys: 'Enter', description: text('Presses the button.', 'Нажимает кнопку.') }],
  pages: ['/components/button'],
};

const select: McpComponent = {
  name: 'NuiSelect',
  package: '@numior/kit',
  styles: {
    import: '@numior/kit/styles/select.css',
    blocks: [{ name: 'nui-select', parts: ['trigger', 'value'], modifiers: ['open'] }],
    tokens: ['--nui-border', '--nui-radius'],
  },
  stylesheets: [
    '@numior/kit/styles/field.css',
    '@numior/kit/styles/list.css',
    '@numior/kit/styles/select.css',
  ],
  props: [
    {
      name: 'size',
      type: 'NuiSize',
      kind: 'enum',
      required: false,
      default: '"md"',
      values: ['sm', 'md', 'lg'],
    },
    { name: 'options', type: 'NuiOption[]', kind: 'other', required: true },
  ],
  models: [
    {
      name: 'v-model',
      prop: 'modelValue',
      event: 'update:modelValue',
      type: 'string',
      description: text('Selected value.', 'Выбранное значение.'),
    },
  ],
  events: [{ name: 'load', type: '[]', description: text('Asks for more.', 'Просит ещё.') }],
  slots: [],
  exposed: [],
  keyboard: [],
  pages: ['/components/select'],
};

const dialog: McpComponent = {
  name: 'NuiDialog',
  package: '@numior/kit',
  styles: {
    import: '@numior/kit/styles/dialog.css',
    blocks: [
      { name: 'nui-dialog', parts: ['panel'], modifiers: [] },
      { name: 'nui-button', parts: ['content'], modifiers: [] },
    ],
    tokens: ['--nui-surface-elevated'],
  },
  stylesheets: ['@numior/kit/styles/dialog.css'],
  messages: 'dialog',
  props: [],
  models: [{ name: 'v-model:open', prop: 'open', event: 'update:open', type: 'boolean' }],
  events: [{ name: 'close', type: '[]' }],
  slots: [],
  exposed: [],
  keyboard: [],
  pages: [],
};

const table: McpComponent = {
  name: 'NuiTable',
  package: '@numior/kit/table',
  styles: {
    import: '@numior/kit/table/styles/table.css',
    blocks: [{ name: 'nui-table', parts: ['cell'], modifiers: [] }],
    tokens: [],
  },
  stylesheets: [
    '@numior/kit/styles.css',
    '@numior/kit/table/styles.css',
    '@numior/kit/table/styles/table.css',
  ],
  props: [
    {
      name: 'rowHeight',
      type: 'number | "auto"',
      kind: 'enum',
      required: false,
      values: ['auto'],
    },
  ],
  models: [],
  events: [{ name: 'rowClick', type: '[row: unknown]' }],
  slots: [],
  exposed: [],
  keyboard: [],
  pages: ['/table'],
};

const page = (path: string, title: string, section: string, markdown: string): McpPage => ({
  path,
  title,
  section,
  description: markdown.split('\n')[2] ?? '',
  markdown,
});

export const fixtureData: McpData = {
  version: 1,
  components: { NuiButton: fixtureButton, NuiSelect: select, NuiDialog: dialog, NuiTable: table },
  catalogs: { dialog: { close: text('Close', 'Закрыть') } },
  exports: {
    '@numior/kit': ['NuiButton', 'NuiButtonVariant', 'NuiDialog', 'NuiSelect'],
    '@numior/kit/table': ['NuiTable'],
    '@numior/kit/forms': ['NuiForm', 'useForm'],
  },
  packageStyles: {
    '@numior/kit': '@numior/kit/styles.css',
    '@numior/kit/table': '@numior/kit/table/styles.css',
  },
  tokens: [
    {
      name: '--nui-primary',
      group: 'primary',
      light: 'oklch(0.55 0.2 260)',
      dark: 'oklch(0.7 0.15 260)',
    },
    { name: '--nui-radius', group: 'radius', light: '0.5rem' },
    { name: '--nui-space-2', group: 'space', light: '0.5rem' },
  ],
  icons: [
    { alias: 'check', icon: 'check' },
    { alias: 'loader', icon: 'loader-circle' },
    { alias: 'trash', icon: 'trash-2' },
  ],
  pages: {
    en: [
      page(
        '/components/button',
        'Button',
        'Components',
        '# Button\n\nA button that starts an action.\n\n## Installation\n\nImport the button with its stylesheet.\n',
      ),
      page(
        '/components/select',
        'Select',
        'Components',
        '# Select\n\nPick one value from a dropdown list.\n\n## Groups\n\n```vue\n<NuiSelect :options="groups" />\n```\n\nPass a record with groups of items.\n',
      ),
      page(
        '/guide/theming',
        'Theming',
        'Guide',
        '# Theming\n\nChange colors through theme tokens.\n\nThe dark theme follows the system.\n',
      ),
      page('/table', 'Table', 'Table', '# Table\n\nRows with sorting and filters.\n'),
    ],
    ru: [
      page(
        '/components/button',
        'Button',
        'Компоненты',
        '# Button\n\nКнопка, которая запускает действие.\n',
      ),
      page(
        '/components/select',
        'Select',
        'Компоненты',
        '# Select\n\nВыбор значения из выпадающего списка.\n',
      ),
      page(
        '/guide/theming',
        'Темы оформления',
        'Руководство',
        '# Темы оформления\n\nЦвета меняются через токены темы.\n',
      ),
      page('/table', 'Таблица', 'Таблица', '# Таблица\n\nСтроки с сортировкой и фильтрами.\n'),
    ],
  },
  examples: {
    en: {
      'button/Basic': [
        { name: 'index.vue', source: '<template>\n  <NuiButton>Save</NuiButton>\n</template>\n' },
      ],
      'select/Basic': [
        {
          name: 'index.vue',
          source: '<script setup lang="ts">\nimport { cities } from \'./cities\';\n</script>\n',
        },
        { name: 'cities.ts', source: "export const cities = ['Austin', 'Boston'];\n" },
      ],
      'select/Groups': [
        { name: 'index.vue', source: '<template>\n  <NuiSelect />\n</template>\n' },
      ],
    },
    ru: {
      'button/Basic': [
        {
          name: 'index.vue',
          source: '<template>\n  <NuiButton>Сохранить</NuiButton>\n</template>\n',
        },
      ],
      'select/Basic': [{ name: 'index.vue', source: '<template>\n  <NuiSelect />\n</template>\n' }],
      'select/Groups': [
        { name: 'index.vue', source: '<template>\n  <NuiSelect />\n</template>\n' },
      ],
    },
  },
};
