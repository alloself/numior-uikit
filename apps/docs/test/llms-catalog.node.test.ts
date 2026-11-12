import { describe, expect, it } from 'vite-plus/test';
import { llmsFull, llmsIndex } from '../.vitepress/llms/catalog';
import type { LlmsCatalog, LlmsEntry } from '../.vitepress/llms/llms.types';
import { site } from '../.vitepress/theme/site';

const entryOf = (section: string, title: string, description: string): LlmsEntry => ({
  link: `/en/components/${title.toLowerCase()}`,
  title,
  group: 'General',
  section,
  path: `en/components/${title.toLowerCase()}.md`,
  description,
  twin: `# ${title}\n\n${description}\n`,
});

const CATALOG: LlmsCatalog = {
  locale: 'en',
  title: 'Numior UI',
  description: 'Vue components for product interfaces.',
  site,
  entries: [
    entryOf('Docs', 'Theming', 'Colors and density.'),
    entryOf('Components', 'Button', 'Starts an action.'),
    entryOf('Components', 'Icon', ''),
  ],
};

describe('catalog for language models', () => {
  it('lists the pages by section with links to their Markdown copies', () => {
    expect(llmsIndex(CATALOG)).toBe(
      [
        '# Numior UI',
        '',
        '> Vue components for product interfaces.',
        '',
        'Every page is available as Markdown at its address followed by `.md`.',
        '',
        '## Docs',
        '',
        '- [Theming](/en/components/theming.md): Colors and density.',
        '',
        '## Components',
        '',
        '- [Button](/en/components/button.md): Starts an action.',
        '- [Icon](/en/components/icon.md)',
        '',
        '## Optional',
        '',
        '- [The whole documentation in one file](/llms-full.txt)',
        '- [Документация на русском](/llms-ru.txt)',
        '',
      ].join('\n'),
    );
  });

  it('writes full addresses once the site address is set and points the Russian list back', () => {
    const published = { siteUrl: 'https://ui.example.org/', repository: '' };
    const index = llmsIndex({ ...CATALOG, locale: 'ru', site: published });

    expect(index).toContain('- [Button](https://ui.example.org/en/components/button.md)');

    expect(index).toContain(
      '- [Вся документация одним файлом](https://ui.example.org/llms-full-ru.txt)',
    );

    expect(index).toContain('- [English documentation](https://ui.example.org/llms.txt)');
  });

  it('joins the copies of all pages into one file', () => {
    expect(llmsFull(CATALOG)).toBe(
      [
        '# Numior UI',
        '',
        '> Vue components for product interfaces.',
        '',
        '---',
        '',
        '# Theming\n\nColors and density.\n',
        '---',
        '',
        '# Button\n\nStarts an action.\n',
        '---',
        '',
        '# Icon\n\n\n',
      ].join('\n'),
    );
  });
});
