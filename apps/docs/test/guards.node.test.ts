import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import {
  apiEntriesOf,
  catalogGuards,
  homeGuards,
  keyboardEntriesOf,
  tautologyGuards,
  textEntriesOf,
} from '../.vitepress/content/catalog-guards';
import { exampleGuards, exampleTextsOf, vocabularyOf } from '../.vitepress/content/example-guards';
import { GuardRule, type GuardProblem } from '../.vitepress/content/guard.types';
import { collectGuardProblems } from '../.vitepress/content/guards';
import { styleGuards } from '../.vitepress/content/style-guards';
import { kitCatalogGuards } from '../.vitepress/content/kit-catalog-guards';
import { catalogPackageGuards, packageGuards } from '../.vitepress/content/package-guards';
import { openingGuards, pageGuards } from '../.vitepress/content/page-guards';
import type { DocsMap } from '../.vitepress/reference/reference.types';

const DOCS = fileURLToPath(new URL('..', import.meta.url));
const REPO = fileURLToPath(new URL('../../..', import.meta.url));

const page = (lead: string, body: readonly string[] = []): string =>
  ['---', 'title: Select', '---', '', '# Select', '', lead, '', ...body].join('\n');

const textsOf = (problems: readonly GuardProblem[], rule: GuardRule): string[] =>
  problems.reduce<string[]>((texts, problem) => {
    if (problem.rule === rule) {
      texts.push(problem.text);
    }
    return texts;
  }, []);

const SELECT_DOCS: DocsMap = {
  NuiSelect: {
    props: {
      hideIcon: { ru: 'Скрывает иконку.', en: 'Hides the icon.' },
      clearable: {
        ru: 'Добавляет кнопку, которая сбрасывает значение в `null`.',
        en: 'Adds a button that resets the value to `null`.',
      },
      disabled: { ru: 'Отключает поле.', en: 'Disables the select.' },
      loading: {
        ru: 'Показывает спиннер, пока варианты загружаются с сервера.',
        en: 'Shows a spinner while the options load from the server.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: { ru: 'Данный вариант выбирается.', en: 'Selects the option under focus.' },
      },
    ],
  },
};

const fence = (info: string, lines: readonly string[]): string =>
  [`\`\`\`${info}`, ...lines, '```'].join('\n');

const SHOP = ["{ name: 'Пётр Волков', city: 'Москва' }", "{ name: 'Анна Титова' }"];

describe('guards of the component pages', () => {
  it('accept a one-line lead and captions said as one instruction', () => {
    const source = page('Выбор одного значения из списка.', [
      '<Example name="select/Basic" />',
      '',
      '## Примеры',
      '',
      '### Сбросить выбор',
      '',
      'Добавьте `clearable`, чтобы рядом со значением появилась кнопка сброса.',
      '',
      '<Example name="select/Clearable" />',
      '',
      '```vue',
      '<NuiSelect>Спиннер в этом примере</NuiSelect>',
      '```',
    ]);

    expect(pageGuards('components/select.md', source)).toEqual([]);

    expect(
      pageGuards(
        'en/components/select.md',
        page('Pick one value from a list.', [
          '### Reset the choice',
          '',
          'Add `clearable` to show a reset button next to the value.',
          '',
          '<Example name="select/Clearable" />',
        ]),
      ),
    ).toEqual([]);
  });

  it('report a lead that defines the component, lists a triad or runs long', () => {
    const problems = pageGuards(
      'components/select.md',
      page(
        '`NuiSelect` — поле для выбора значений: страны, города, исполнителя. Список открывается под полем.',
      ),
    );

    expect(textsOf(problems, GuardRule.Lead)).toEqual([
      'starts with the component name and a dash',
      'lists examples after a colon',
      '2 sentences',
    ]);

    expect(pageGuards('guide/theming.md', page('`theme.css` — файл с токенами. Он один.'))).toEqual(
      [],
    );
  });

  it('report captions that retell the prop, run long or give no instruction', () => {
    const problems = pageGuards(
      'components/select.md',
      page('Выбор одного значения из списка.', [
        '### Размеры',
        '',
        '`size` принимает `sm`, `md` и `lg`.',
        '',
        '<Example name="select/Sizes" />',
        '',
        '### Группы',
        '',
        'Передайте запись с `items`. Вариант с `disabled` выбрать нельзя.',
        '',
        '<Example name="select/Groups" />',
        '',
        '### Поведение',
        '',
        'Этот абзац стоит под заголовком без примера и подписью не считается. Он длинный.',
      ]),
    );

    expect(textsOf(problems, GuardRule.Caption)).toEqual([
      'starts with a prop or an article: `size` принимает `sm`, `md` и `lg`.',
      'has no imperative verb: `size` принимает `sm`, `md` и `lg`.',
      '2 sentences: Передайте запись с `items`. Вариант с `disabled` выбрать нельзя.',
    ]);

    expect(
      textsOf(
        pageGuards(
          'en/components/select.md',
          page('Pick one value from a list.', [
            '### Sizes',
            '',
            'The `size` prop takes `sm`, `md` and `lg`.',
            '',
            '<Example name="select/Sizes" />',
          ]),
        ),
        GuardRule.Caption,
      ),
    ).toEqual(['starts with a prop or an article: The `size` prop takes `sm`, `md` and `lg`.']);
  });

  it('report an opening that more than three pages of one locale share', () => {
    const pages = Object.fromEntries(
      ['input', 'select', 'combobox', 'textarea'].map((name) => [
        `components/${name}.md`,
        page('Поле ввода для формы заказа.'),
      ]),
    );

    expect(openingGuards(pages)).toEqual(
      Object.keys(pages).map((file) => ({
        rule: GuardRule.Opening,
        file,
        text: '«поле ввода для» opens 4 pages',
      })),
    );

    expect(
      openingGuards({
        ...Object.fromEntries(Object.entries(pages).slice(0, 3)),
        'en/components/input.md': page('Поле ввода для формы заказа.'),
        'guide/forms.md': page('Поле ввода для формы заказа.'),
      }),
    ).toEqual([]);
  });

  it('report second names of a term, text about the page and speed figures in prose', () => {
    const ru = pageGuards(
      'guide/table.md',
      page('Таблица.', [
        'Скринридер читает подпись, а чекбокс отмечает строку по щелчку.',
        '',
        'На этой странице собраны приёмы работы с таблицей.',
        '',
        'Сортировка 100 000 строк занимает 12 мс, прокрутка идёт на 60 fps.',
        '',
        'Подсказка появляется через 300 мс после наведения.',
        '',
        '<BenchTable name="table" />',
      ]),
    );

    expect(textsOf(ru, GuardRule.Glossary)).toEqual([
      '«Скринридер» → экранный диктор',
      '«чекбокс» → флажок',
      '«щелчку» → клик',
    ]);

    expect(textsOf(ru, GuardRule.Meta)).toEqual(['На этой странице собраны']);
    expect(textsOf(ru, GuardRule.Speed)).toEqual(['12 мс']);

    const en = pageGuards(
      'en/guide/table.md',
      page('Table.', [
        'The colour of a cancelled order is grey, and `cancelled` stays in code.',
        '',
        'This example sorts rows 3x faster.',
      ]),
    );

    expect(textsOf(en, GuardRule.Glossary)).toEqual(['«colour» → US spelling']);
    expect(textsOf(en, GuardRule.Meta)).toEqual(['This example']);
    expect(textsOf(en, GuardRule.Speed)).toEqual(['3x faster']);
  });
});

describe('guards of the stylesheets in code blocks', () => {
  it('accept the Tailwind entry with the theme and the styles of the whole kit', () => {
    const source = page('Установка.', [
      '## Установка',
      '',
      fence('ts', ["import { NuiSelect } from '@numior/kit';"]),
      '',
      fence('css', [
        "@import 'tailwindcss';",
        "@import '@numior/kit/tailwind/theme.css';",
        "@import '@numior/kit/styles.css';",
      ]),
    ]);

    expect(styleGuards('guide/tailwind.md', source)).toEqual([]);
  });

  it('report the styles of a component or a module imported by hand', () => {
    const source = page('Таблица.', [
      fence('ts', ["import '@numior/kit/styles/select.css';"]),
      '',
      fence('css', ["@import '@numior/kit/table/styles.css';"]),
      '',
      fence('css', ["@import url('@numior/kit/editor/styles/editor.css');"]),
    ]);

    expect(textsOf(styleGuards('table/index.md', source), GuardRule.Styles)).toEqual([
      'a code block imports the styles of components or a module; @numior/kit/styles.css brings them',
      'a code block imports kit CSS from a script or a component style block; it belongs in the Tailwind entry',
      'a code block imports the styles of components or a module; @numior/kit/styles.css brings them',
      'a code block imports the styles of components or a module; @numior/kit/styles.css brings them',
    ]);
  });

  it('report kit CSS imported from a script or from the style block of a component', () => {
    const source = page('Начало работы.', [
      fence('ts', ["import '@numior/kit/styles.css';", "import '@numior/kit/theme.css';"]),
      '',
      fence('vue', ['<style>', "@import '@numior/kit/prose.css';", '</style>']),
      '',
      fence('ts', ["import './style.css';"]),
    ]);

    expect(textsOf(styleGuards('guide/getting-started.md', source), GuardRule.Styles)).toEqual([
      'a code block imports kit CSS from a script or a component style block; it belongs in the Tailwind entry',
      'a code block imports kit CSS from a script or a component style block; it belongs in the Tailwind entry',
    ]);
  });
});

describe('guards of the package names', () => {
  it('report packages inside the kit named in pages, examples and catalog texts', () => {
    const source = [
      'Таблица из `@numior/kit/table` рисует фильтры компонентами `@numior/vue`.',
      '',
      fence('sh', ['pnpm add @numior/table @numior/kit', 'npx @numior/mcp']),
      '',
      fence('ts', ["import { NuiTable } from '@numior/table';"]),
    ].join('\n');

    expect(textsOf(packageGuards('table/index.md', source), GuardRule.Imports)).toEqual([
      '@numior/vue is a package inside the kit; the docs name @numior/kit',
      '@numior/table is a package inside the kit; the docs name @numior/kit',
    ]);

    expect(
      catalogPackageGuards(
        'api/table.ts',
        [
          "import type { DocsMap } from '@numior/vue';",
          "export default { NuiTable: { ru: 'Таблица из `@numior/kit/table`.' } };",
        ].join('\n'),
      ),
    ).toEqual([]);
  });
});

describe('guards of the text catalogs', () => {
  it('report API descriptions that only repeat the name of the member', () => {
    const entries = apiEntriesOf('api/select.ts', SELECT_DOCS);

    expect(entries).toHaveLength(8);

    expect(textsOf(tautologyGuards(entries), GuardRule.Tautology)).toEqual([
      'NuiSelect.props.hideIcon (ru): Скрывает иконку.',
      'NuiSelect.props.hideIcon (en): Hides the icon.',
      'NuiSelect.props.disabled (ru): Отключает поле.',
      'NuiSelect.props.disabled (en): Disables the select.',
    ]);
  });

  it('lint the strings of API files, keyboard rows and theme texts as prose', () => {
    const problems = catalogGuards(
      [
        ...apiEntriesOf('api/select.ts', SELECT_DOCS),
        ...keyboardEntriesOf('api/select.ts', SELECT_DOCS),
      ],
      false,
    );

    expect(textsOf(problems, GuardRule.Glossary)).toEqual([
      'NuiSelect.props.loading (ru): «спиннер» → индикатор загрузки',
      'NuiSelect.props.loading (en): «spinner» → loading indicator',
    ]);

    expect(textsOf(problems, GuardRule.Catalog)).toEqual([
      'NuiSelect.keyboard.Enter (ru): phrase — данный',
    ]);

    const texts = textEntriesOf('texts.ts', 'ru', {
      search: 'Поиск',
      home: '/guide/',
      nested: { hint: 'Блок `nui-code__line` позволяет выделить строку.', count: 3 },
    });

    expect(texts.map((entry) => entry.path)).toEqual(['search', 'nested.hint']);

    expect(textsOf(catalogGuards(texts, true), GuardRule.Catalog)).toEqual([
      'nested.hint (ru): phrase — позволяет',
      'nested.hint (ru): internals — nui-code__line',
    ]);

    expect(textsOf(catalogGuards(texts, false), GuardRule.Catalog)).toEqual([
      'nested.hint (ru): phrase — позволяет',
    ]);
  });

  it('keep inventories, contrasts and praise off the home page', () => {
    const ru = textEntriesOf('home-content.ts', 'ru', {
      title: 'Компоненты для Vue 3',
      install: 'pnpm add @numior/kit',
      thought: 'Мы собираем на нём свои продукты.',
      tagline: '53 компонента вместо сборки из разных библиотек, удобно и современно.',
    });

    expect(textsOf(homeGuards(ru), GuardRule.Home)).toEqual([
      'tagline (ru): вместо',
      'tagline (ru): удобно',
      'tagline (ru): 53 компонента',
    ]);

    expect(
      textsOf(
        homeGuards(
          textEntriesOf('home-content.ts', 'en', {
            tagline: 'A powerful kit instead of five libraries.',
          }),
        ),
        GuardRule.Home,
      ),
    ).toEqual(['tagline (en): instead of', 'tagline (en): powerful']);
  });
});

describe('guards of the examples', () => {
  const context = { vocabulary: vocabularyOf(SHOP, 'ru') };

  it('read the visible texts of an example without its imports', () => {
    expect(
      exampleTextsOf(
        [
          '<template>',
          '  <NuiButton aria-label="Закрыть" :size="size">Сохранить</NuiButton>',
          '</template>',
          '',
          '<script setup lang="ts">',
          "import { NuiButton } from '@numior/kit';",
          '',
          "const size = 'sm';",
          '</script>',
        ].join('\n'),
      ),
    ).toEqual(['Закрыть', 'Сохранить', 'sm']);

    expect([...context.vocabulary]).toEqual(['Пётр Волков', 'Анна Титова']);
  });

  it('accept an example that speaks in shop data', () => {
    const source = [
      '<template>',
      '  <NuiSelect v-model="manager" :options="options" label="Менеджер заказа" />',
      '  <p>Заказ ведёт Анна Титова, клиент Пётр Волков.</p>',
      '</template>',
      '',
      '<script setup lang="ts">',
      "import { ref } from 'vue';",
      "import { NuiSelect, useToast } from '@numior/kit';",
      '',
      "const manager = ref('Анна Титова');",
      'const toast = useToast();',
      '</script>',
    ].join('\n');

    expect(exampleGuards('examples/ru/select/Basic.vue', 'ru', source, context)).toEqual([]);
  });

  it('report filler labels, dumps of state and unknown people', () => {
    const source = [
      '<template>',
      '  <NuiButton size="sm">Маленькая</NuiButton>',
      '  <NuiTab value="a">Первый</NuiTab>',
      '  <p>Выбрано: {{ value }}</p>',
      '  <p>Второй диалог в этом примере встаёт выше, его открыл Иван Петров.</p>',
      '</template>',
      '',
      '<script setup lang="ts">',
      "import { NuiButton, NuiTab, useToast, type ToastOptions } from '@numior/kit';",
      '</script>',
    ].join('\n');

    const problems = exampleGuards('examples/ru/tabs/Basic.vue', 'ru', source, context);

    expect(textsOf(problems, GuardRule.Filler)).toEqual(['Маленькая', 'Первый', 'Второй']);
    expect(textsOf(problems, GuardRule.Meta)).toEqual(['в этом примере']);
    expect(textsOf(problems, GuardRule.Dump)).toEqual(['Выбрано: {{ … }}']);
    expect(textsOf(problems, GuardRule.Names)).toEqual(['Иван Петров is not in the shop data']);

    expect(
      textsOf(
        exampleGuards(
          'examples/en/tabs/Basic.vue',
          'en',
          '<template><NuiTab value="a">Item 1</NuiTab><p>Content by John Smith in New York</p></template>',
          { vocabulary: new Set() },
        ),
        GuardRule.Names,
      ),
    ).toEqual(['John Smith is not in the shop data']);
  });

  it('report British spellings in the visible text of an English example, not in its keys', () => {
    const source = [
      '<template>',
      '  <NuiTable caption="Programme of the day" />',
      '  <p>Moves to the neighbouring column.</p>',
      '</template>',
      '',
      '<script setup lang="ts">',
      "const status = 'cancelled';",
      '</script>',
    ].join('\n');

    const problems = exampleGuards('examples/en/table/Merges.vue', 'en', source, {
      vocabulary: new Set(),
    });

    expect(textsOf(problems, GuardRule.Glossary)).toEqual([
      '«Programme» → US spelling',
      '«neighbouring» → US spelling',
    ]);
  });
});

describe('guards of the kit catalogs', () => {
  it('report British spellings in the texts of a catalog, not in its keys and values', () => {
    const source = [
      "import type { Messages } from './list.types';",
      '',
      'export const listMessages = {',
      "  namespace: 'list',",
      '  en: {',
      '    cancelled: ({ index }) => `Row ${index}, move cancelled.`,',
      "    status: 'cancelled',",
      "    empty: 'No rows yet',",
      '  },',
      '  ru: { cancelled: ({ index }) => `Строка ${index}: перемещение отменено.` },',
      '};',
    ].join('\n');

    expect(
      textsOf(
        kitCatalogGuards('packages/vue/src/list/list.messages.ts', source),
        GuardRule.Glossary,
      ),
    ).toEqual(['«cancelled» → US spelling']);
  });
});

describe('guards on the docs', () => {
  it('find nothing in the pages, examples, catalogs and kit texts', async () => {
    const findings = await collectGuardProblems(DOCS, REPO);

    expect(findings).toEqual([]);
  });
});
