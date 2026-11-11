import { describe, expect, it } from 'vite-plus/test';
import type { TwinContext, TwinFile } from '../.vitepress/llms/llms.types';
import { pageTwin } from '../.vitepress/llms/twin';
import type { ReferenceBundle } from '../.vitepress/reference/reference.types';
import { en, ru } from '../.vitepress/theme/texts';

const EXAMPLES: Readonly<Record<string, readonly TwinFile[]>> = {
  'button/Basic': [
    { name: 'Basic.vue', source: '<template>\n  <NuiButton>Сохранить</NuiButton>\n</template>\n' },
  ],
  'select/Example': [
    { name: 'Example.vue', source: '<template>\n  <NuiSelect :options="team" />\n</template>\n' },
    { name: 'team.ts', source: "export const team = ['Анна'];\n" },
  ],
  'code/Fenced': [{ name: 'Fenced.vue', source: '<template>\n  ```\n</template>\n' }],
};

const BUNDLE: ReferenceBundle = {
  version: 1,
  components: {
    NuiButton: {
      name: 'NuiButton',
      package: '@numior/vue',
      family: 'button',
      file: 'packages/vue/src/button/NuiButton.vue',
      styles: { import: '@numior/vue/button.css', blocks: [], tokens: [] },
      messages: 'button',
      props: [
        {
          name: 'variant',
          type: "'solid' | 'ghost'",
          kind: 'enum',
          required: false,
          default: "'solid'",
          values: ['solid', 'ghost'],
          description: { ru: 'Вид кнопки.', en: 'Look of the button.' },
        },
        {
          name: 'to',
          type: 'string',
          kind: 'string',
          required: true,
          default: undefined,
          values: undefined,
          description: undefined,
        },
      ],
      models: [],
      events: [
        { name: 'click', type: 'MouseEvent', description: { ru: 'Нажатие.', en: 'A click.' } },
      ],
      slots: [],
      exposed: [],
      keyboard: [
        { keys: 'Enter', description: { ru: 'Нажимает кнопку.', en: 'Presses the button.' } },
      ],
      configurator: undefined,
    },
    NuiSelect: {
      name: 'NuiSelect',
      package: '@numior/vue',
      family: 'select',
      file: 'packages/vue/src/select/NuiSelect.vue',
      styles: undefined,
      messages: undefined,
      props: [],
      models: [],
      events: [],
      slots: [],
      exposed: [],
      keyboard: [],
      configurator: { scene: 'select/Example', props: ['size'] },
    },
  },
  catalogs: {
    button: { namespace: 'button', texts: { loading: { ru: 'Загрузка', en: 'Loading' } } },
  },
  declarations: [
    {
      name: 'useHotkey',
      package: '@numior/primitives',
      kind: 'function',
      signature: 'declare const useHotkey: (keys: string) => void;',
    },
    {
      name: 'HotkeyOptions',
      package: '@numior/primitives',
      kind: 'type',
      signature: 'interface HotkeyOptions {}',
    },
  ],
  tokens: [
    { name: '--nui-radius-md', group: 'radius', light: '0.5rem', dark: undefined },
    { name: '--nui-surface', group: 'color', light: '#fff', dark: '#111' },
  ],
  icons: [{ alias: 'copy', icon: 'Copy' }],
};

const contextOf = (locale: 'ru' | 'en' = 'ru'): TwinContext => ({
  locale,
  texts: locale === 'ru' ? ru : en,
  bundle: BUNDLE,
  exampleOf: (name) => EXAMPLES[name],
});

describe('markdown twin of a page', () => {
  it('drops the frontmatter and containers and keeps the prose as it is', () => {
    const page =
      '---\ntitle: Button\n---\n# Button\n\nКнопка для действий.\n\n::: tip\nСовет.\n:::\n';

    expect(pageTwin(page, contextOf())).toBe('# Button\n\nКнопка для действий.\n\nСовет.\n');
  });

  it('prints an example as the code of its files and names the files when there are several', () => {
    const single = pageTwin('<Example name="button/Basic" />\n', contextOf());

    expect(single).toBe(
      '```vue\n<template>\n  <NuiButton>Сохранить</NuiButton>\n</template>\n```\n',
    );

    const scene = pageTwin('<Configurator name="NuiSelect" />\n', contextOf());

    expect(scene).toContain('`Example.vue`\n\n```vue\n<template>');
    expect(scene).toContain("`team.ts`\n\n```ts\nexport const team = ['Анна'];\n```");
  });

  it('leaves out a configurator without a scene and an example that does not exist', () => {
    const page =
      'До.\n\n<Configurator name="NuiButton" />\n\n<Example name="button/None" />\n\nПосле.\n';

    expect(pageTwin(page, contextOf())).toBe('До.\n\nПосле.\n');
  });

  it('fences a source that holds a fence itself with a longer fence', () => {
    const twin = pageTwin('<Example name="code/Fenced" />\n', contextOf());

    expect(twin.startsWith('````vue\n')).toBe(true);
    expect(twin.endsWith('\n````\n')).toBe(true);
  });

  it('keeps docs tags inside a code block untouched', () => {
    const page = '```md\n<Example name="button/Basic" />\n::: tip\n```\n';

    expect(pageTwin(page, contextOf())).toBe(page);
  });

  it('turns the API of a component into an import and tables in the language of the page', () => {
    const twin = pageTwin('## API\n\n<ApiReference name="NuiButton" />\n', contextOf('en'));

    expect(twin).toContain('### NuiButton');

    expect(twin).toContain(
      "import { NuiButton } from '@numior/vue';\nimport '@numior/vue/button.css';",
    );

    expect(twin).toContain('#### Props\n\n| Name | Type | Default | Description |');

    expect(twin).toContain(
      "| `variant` | `'solid' \\| 'ghost'` | `'solid'` | Look of the button. |",
    );

    expect(twin).toContain('| `to` (required) | `string` |  |  |');
    expect(twin).toContain('#### Events\n\n| Name | Payload | Description |');
    expect(twin).toContain('| `click` | `MouseEvent` | A click. |');
    expect(twin).toContain('#### Texts\n\n| Key | Text |\n| --- | --- |\n| `loading` | Loading |');
    expect(twin).not.toContain('#### Slots');
  });

  it('prints several components, keyboard keys, signatures, tokens and icons', () => {
    const several = pageTwin(
      "<ApiReference :names=\"['NuiButton', 'NuiSelect']\" />\n",
      contextOf(),
    );

    expect(several).toContain('### NuiButton');
    expect(several).toContain('### NuiSelect');

    expect(pageTwin('<KeyboardReference name="NuiButton" />\n', contextOf())).toBe(
      '| Клавиши | Действие |\n| --- | --- |\n| `Enter` | Нажимает кнопку. |\n',
    );

    const signatures = pageTwin(
      "<SignatureReference\n  :names=\"['useHotkey', 'HotkeyOptions']\"\n/>\n",
      contextOf(),
    );

    expect(signatures).toContain(
      "```ts\nimport { useHotkey } from '@numior/primitives';\n\ndeclare const useHotkey: (keys: string) => void;\n```",
    );

    expect(signatures).toContain("import type { HotkeyOptions } from '@numior/primitives';");

    expect(pageTwin('<TokenReference section="shape" />\n', contextOf())).toContain(
      '| `--nui-radius-md` | `0.5rem` |  |',
    );

    expect(pageTwin('<IconReference />\n', contextOf())).toContain('| `copy` | `Copy` |');
  });
});
