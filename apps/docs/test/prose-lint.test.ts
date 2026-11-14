import { describe, expect, it } from 'vite-plus/test';
import { lintProse } from '../.vitepress/content/prose-lint';

const CLEAN = `---
title: Кнопка
---

# Кнопка

\`NuiButton\` — нативная кнопка с двумя осями оформления. Она берёт цвета из токенов роли.

<Example name="button/Basic" />

## Размеры

- \`sm\` — компактные панели.
- \`lg\` — герои и формы.
- [Кнопка](/components/button) — первый компонент. [Темы](/theming) — токены. [Словарь](/localization) — тексты.

| Клавиша | Действие |
| ------- | -------- |
| Enter   | Нажимает |

\`\`\`vue
<NuiButton>Позволяет</NuiButton>
\`\`\`

## API

Блок \`nui-button__content\` держит текст.
`;

describe('prose lint', () => {
  it('accepts short paragraphs, lists, tables, code, tags and BEM names inside the API section', () => {
    expect(lintProse(CLEAN, 'ru')).toEqual([]);
  });

  it('accepts the public theme classes in prose', () => {
    expect(
      lintProse('Класс `nui-theme--dark` включает тёмную схему внутри элемента.', 'ru'),
    ).toEqual([]);
  });

  it('matches banned phrases as whole words only', () => {
    expect(lintProse('Список появляется над полем, когда данные загружены.', 'ru')).toEqual([]);

    expect(lintProse('Компонент является кнопкой.', 'ru').map((problem) => problem.text)).toEqual([
      'является',
    ]);
  });

  it('reports long sentences, long paragraphs, banned phrases and internals in prose', () => {
    const page = `# Кнопка

Раз. Два. Три. Четыре.

Данный компонент позволяет ${'очень '.repeat(24)}много.

Модификатор \`nui-button--loading\` и переменная \`--_height\`.

- [Раз](/a) — первый. [Два](/b) — второй. [Три](/c) — третий. [Четыре](/d) — четвёртый.
`;

    expect(lintProse(page, 'ru')).toEqual([
      { line: 3, rule: 'paragraph', text: '4 sentences' },
      {
        line: 5,
        rule: 'sentence',
        text: `Данный компонент позволяет ${'очень '.repeat(24)}много.`,
      },
      { line: 5, rule: 'phrase', text: 'позволяет' },
      { line: 5, rule: 'phrase', text: 'данный' },
      { line: 7, rule: 'internals', text: 'nui-button--loading' },
      { line: 9, rule: 'paragraph', text: '4 sentences' },
    ]);

    expect(
      lintProse('Please note that this is powerful.', 'en').map((problem) => problem.text),
    ).toEqual(['please note', 'powerful']);
  });
});
