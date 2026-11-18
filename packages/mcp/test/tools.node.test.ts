import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { fixtureData } from './fixtures/data';
import { McpSession } from './harness/mcp-session';

let session: McpSession;

beforeEach(async () => {
  session = await McpSession.open();
});

afterEach(async () => {
  await session.close();
});

describe('list_components', () => {
  it('lists every component with its package, page and summary', async () => {
    const reply = await session.call('list_components');

    expect(reply.json()).toEqual([
      {
        name: 'NuiButton',
        package: '@numior/kit',
        page: '/components/button',
        description: 'A button that starts an action.',
      },
      {
        name: 'NuiSelect',
        package: '@numior/kit',
        page: '/components/select',
        description: 'Pick one value from a dropdown list.',
      },
      { name: 'NuiDialog', package: '@numior/kit' },
      {
        name: 'NuiTable',
        package: '@numior/kit/table',
        page: '/table',
        description: 'Rows with sorting and filters.',
      },
    ]);
  });

  it('keeps the components of one package and names the packages for an unknown one', async () => {
    const table = await session.call('list_components', {
      package: '@numior/kit/table',
      locale: 'ru',
    });

    const charts = await session.call('list_components', { package: '@numior/kit/charts' });

    expect(table.json()).toEqual([
      {
        name: 'NuiTable',
        package: '@numior/kit/table',
        page: '/table',
        description: 'Строки с сортировкой и фильтрами.',
      },
    ]);

    expect(charts.error).toBe(true);

    expect(charts.text).toBe(
      'No components come from `@numior/kit/charts`. Packages with components: `@numior/kit`, `@numior/kit/table`.',
    );
  });
});

describe('get_component', () => {
  it('finds a component by a short or kebab name and adds its page', async () => {
    const reply = await session.call('get_component', { name: 'select' });

    expect(reply.json()).toMatchObject({
      name: 'NuiSelect',
      import: "import { NuiSelect } from '@numior/kit';",
      models: [{ name: 'v-model', prop: 'modelValue', description: 'Selected value.' }],
      events: [{ name: 'load', payload: '[]', description: 'Asks for more.' }],
      tokens: ['--nui-border', '--nui-radius'],
    });

    expect(reply.texts[1]).toContain('# Select');
  });

  it('answers in Russian with the built-in texts of the component', async () => {
    const dialog = await session.call('get_component', { name: 'nui-dialog', locale: 'ru' });
    const button = await session.call('get_component', { name: 'NuiButton', locale: 'ru' });

    expect(dialog.texts).toHaveLength(1);
    expect(dialog.json()).toMatchObject({ name: 'NuiDialog', texts: { close: 'Закрыть' } });

    expect(button.json()).toMatchObject({
      keyboard: [{ keys: 'Enter', action: 'Нажимает кнопку.' }],
      slots: [{ name: 'default', props: '{}', description: 'Подпись.' }],
    });

    expect(button.texts[1]).toContain('Кнопка, которая запускает действие.');
  });

  it('names the nearest component for an unknown name', async () => {
    const reply = await session.call('get_component', { name: 'Buton' });

    expect(reply.error).toBe(true);
    expect(reply.text).toBe('Numior UI has no component `Buton`. Did you mean `NuiButton`?');
  });
});

describe('get_example', () => {
  it('prints every file of an example as a fenced block', async () => {
    const reply = await session.call('get_example', { name: 'select/Basic' });

    expect(reply.text).toBe(
      [
        '`index.vue`',
        '',
        '```vue',
        '<script setup lang="ts">',
        "import { cities } from './cities';",
        '</script>',
        '```',
        '',
        '`cities.ts`',
        '',
        '```ts',
        "export const cities = ['Austin', 'Boston'];",
        '```',
        '',
      ].join('\n'),
    );
  });

  it('opens a longer fence than any backtick run inside the source', async () => {
    const own = await McpSession.open({
      ...fixtureData,
      examples: {
        ...fixtureData.examples,
        en: { 'docs/Fence': [{ name: 'notes.md', source: 'Run ````pnpm build````.\n' }] },
      },
    });

    const reply = await own.call('get_example', { name: 'docs/Fence' });

    await own.close();

    expect(reply.text).toBe('`notes.md`\n\n`````md\nRun ````pnpm build````.\n`````\n');
  });

  it('suggests the examples of the same family or explains the names', async () => {
    const family = await session.call('get_example', { name: 'select/Basc', locale: 'ru' });
    const unknown = await session.call('get_example', { name: 'chart' });

    expect(family.text).toBe(
      'Примера `select/Basc` нет. Похожие имена: `select/Basic`, `select/Groups`.',
    );

    expect(unknown.text).toBe(
      'There is no example `chart`. Names look like `select/Basic`; get_page prints the examples of a page as code.',
    );
  });
});

describe('get_page', () => {
  it('reads a page by a path, a site address or a Markdown file name', async () => {
    const english = await session.call('get_page', { path: '/en/guide/theming/' });
    const address = await session.call('get_page', { path: 'https://example.com/en/table?x=1#y' });
    const file = await session.call('get_page', { path: 'components/select.md', locale: 'ru' });

    expect(english.text).toContain('Change colors through theme tokens.');
    expect(address.text).toContain('# Table');
    expect(file.text).toContain('Выбор значения из выпадающего списка.');
  });

  it('names the nearest page for an unknown path', async () => {
    const reply = await session.call('get_page', { path: '/guide/theme' });

    expect(reply.error).toBe(true);
    expect(reply.text).toBe('There is no page `/guide/theme`. Did you mean `/guide/theming`?');
  });
});

describe('search', () => {
  it('ranks the pages and quotes the line with the words', async () => {
    const reply = await session.call('search', { query: 'theme tokens' });

    expect(reply.json()).toEqual([
      expect.objectContaining({
        path: '/guide/theming',
        title: 'Theming',
        section: 'Guide',
        snippet: 'Change colors through theme tokens.',
      }),
    ]);
  });

  it('quotes prose rather than a heading or code and falls back to the summary', async () => {
    const groups = await session.call('search', { query: 'groups' });
    const theming = await session.call('search', { query: 'theming' });

    expect(groups.json()).toEqual([
      expect.objectContaining({
        path: '/components/select',
        snippet: 'Pass a record with groups of items.',
      }),
    ]);

    expect(theming.json()).toEqual([
      expect.objectContaining({
        path: '/guide/theming',
        snippet: 'Change colors through theme tokens.',
      }),
    ]);
  });

  it('searches the Russian pages and keeps to the limit', async () => {
    const russian = await session.call('search', { query: 'токены', locale: 'ru' });
    const limited = await session.call('search', { query: 'select dropdown button', limit: 1 });

    expect(russian.json()).toEqual([
      expect.objectContaining({
        path: '/guide/theming',
        snippet: 'Цвета меняются через токены темы.',
      }),
    ]);

    expect(limited.json()).toHaveLength(1);
  });
});

describe('list_tokens', () => {
  it('lists the tokens of a group with both themes', async () => {
    const all = await session.call('list_tokens');
    const primary = await session.call('list_tokens', { group: 'Primary' });

    expect(all.json()).toHaveLength(3);

    expect(primary.json()).toEqual([
      {
        name: '--nui-primary',
        group: 'primary',
        light: 'oklch(0.55 0.2 260)',
        dark: 'oklch(0.7 0.15 260)',
      },
    ]);
  });

  it('names the groups for an unknown one', async () => {
    const reply = await session.call('list_tokens', { group: 'color' });

    expect(reply.error).toBe(true);

    expect(reply.text).toBe(
      'There is no token group `color`. Groups: `primary`, `radius`, `space`.',
    );
  });
});

describe('list_icons', () => {
  it('filters the aliases by alias or icon name', async () => {
    const all = await session.call('list_icons');
    const circle = await session.call('list_icons', { query: 'Circle' });

    expect(all.json()).toHaveLength(3);
    expect(circle.json()).toEqual([{ alias: 'loader', icon: 'loader-circle' }]);
  });
});

describe('check_usage', () => {
  it('returns the diagnostics of a file with its name', async () => {
    const reply = await session.call('check_usage', {
      code: '<template>\n  <NuiButon />\n</template>\n',
      filename: 'Toolbar.vue',
    });

    expect(reply.json()).toEqual({
      file: 'Toolbar.vue',
      diagnostics: [
        {
          line: 2,
          column: 3,
          severity: 'error',
          code: 'unknown-component',
          message: 'Numior UI has no component `NuiButon`.',
          hint: 'Did you mean `NuiButton`?',
        },
      ],
    });
  });
});

describe('errors', () => {
  it('point to the listing tools when no name is close', async () => {
    const component = await session.call('get_component', { name: 'QuantumFlux' });
    const page = await session.call('get_page', { path: '/zzzzzzzzzzzzzz' });

    expect(component.text).toBe(
      'Numior UI has no component `QuantumFlux`. list_components shows the available components.',
    );

    expect(page.text).toBe('There is no page `/zzzzzzzzzzzzzz`. search finds pages by words.');
  });

  it('speak Russian when asked', async () => {
    const ru = { locale: 'ru' };
    const close = await session.call('get_component', { name: 'Buton', ...ru });
    const far = await session.call('get_component', { name: 'QuantumFlux', ...ru });
    const page = await session.call('get_page', { path: '/guide/theme', ...ru });
    const lost = await session.call('get_page', { path: '/zzzzzzzzzzzzzz', ...ru });
    const charts = await session.call('list_components', { package: '@numior/kit/charts', ...ru });
    const example = await session.call('get_example', { name: 'chart', ...ru });

    expect([close, far, page, lost, charts, example].map((reply) => reply.text)).toEqual([
      'В Numior UI нет компонента `Buton`. Возможно, имелся в виду `NuiButton`.',
      'В Numior UI нет компонента `QuantumFlux`. Список компонентов показывает list_components.',
      'Страницы `/guide/theme` нет. Возможно, имелась в виду `/guide/theming`.',
      'Страницы `/zzzzzzzzzzzzzz` нет. Страницы по словам находит search.',
      'В `@numior/kit/charts` нет компонентов. Пакеты с компонентами: `@numior/kit`, `@numior/kit/table`.',
      'Примера `chart` нет. Имена выглядят как `select/Basic`; get_page выводит примеры страницы кодом.',
    ]);
  });
});
