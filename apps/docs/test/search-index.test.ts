import MiniSearch from 'minisearch';
import { describe, expect, it } from 'vite-plus/test';
import {
  createSearchIndex,
  loadSearchIndex,
  namedSections,
  pageItems,
  searchFields,
  searchHits,
  searchItems,
  sectionOf,
  snippetOf,
  snippetsOf,
  type SnippetPart,
} from '../.vitepress/theme/search-index';

interface SearchDocument {
  readonly id: string;
  readonly title: string;
  readonly titles: readonly string[];
  readonly text: string;
}

const LONG_TEXT = [
  'Заказы приходят из кабинета магазина каждый день, и менеджер открывает их по одному.',
  'Чтобы не ждать ответа сервера, покажите индикатор загрузки на кнопке &quot;Сохранить&quot;',
  'и верните фокус на неё, когда запрос закончится, а потом закройте окно заказа.',
].join('\n');

const DOCUMENTS: readonly SearchDocument[] = [
  { id: '/components/button', title: 'Button', titles: [], text: 'Кнопка для действий.' },
  { id: '/components/button#sizes', title: 'Размеры', titles: ['Button'], text: LONG_TEXT },
  { id: '/guide/forms', title: 'Формы', titles: [], text: 'Кнопка отправляет форму.' },
  { id: '/changelog', title: 'Изменения', titles: [], text: 'Кнопка получила новый размер.' },
];

const serializedIndex = (): string => {
  const index = new MiniSearch<SearchDocument>(searchFields());

  index.addAll([...DOCUMENTS]);
  return JSON.stringify(index);
};

const hitTexts = (parts: readonly SnippetPart[]): string[] =>
  parts.reduce<string[]>((texts, part) => {
    if (part.hit) {
      texts.push(part.text);
    }
    return texts;
  }, []);

const textOf = (parts: readonly { readonly text: string }[]): string =>
  parts.map((part) => part.text).join('');

describe('docs search index', () => {
  it('finds sections by a word prefix and names a section by its page and heading', () => {
    const hits = searchHits(createSearchIndex(serializedIndex()), 'кноп');

    expect(hits.map((hit) => hit.link)).toEqual([
      '/components/button#sizes',
      '/components/button',
      '/guide/forms',
      '/changelog',
    ]);

    expect(hits[0]?.label).toBe('Button › Размеры');
  });

  it('cuts a snippet around the first found word and marks every found word in it', () => {
    const [hit] = searchHits(createSearchIndex(serializedIndex()), 'индикатор кнопке');
    const snippet = hit?.snippet ?? [];

    expect(hit?.link).toBe('/components/button#sizes');

    expect(hitTexts(snippet)).toEqual(['индикатор', 'кнопке']);

    expect(textOf(snippet)).toMatch(/^….*покажите индикатор загрузки на кнопке "Сохранить".*…$/u);
    expect(textOf(snippet).length).toBeLessThan(150);
  });

  it('leaves a result found by its title without a snippet', () => {
    const [hit] = searchHits(createSearchIndex(serializedIndex()), 'размеры');

    expect(hit?.label).toBe('Button › Размеры');
    expect(hit?.snippet).toEqual([]);
    expect(snippetOf('Короткий текст.', [])).toEqual([]);
  });

  it('keeps a short text whole and matches the found word in any letter case', () => {
    expect(snippetOf('Кнопка отправляет форму.', ['кнопка'])).toEqual([
      { text: 'Кнопка', hit: true },
      { text: ' отправляет форму.', hit: false },
    ]);
  });

  it('keeps the results in the order of relevance and cuts a snippet for each', () => {
    const hits = searchHits(createSearchIndex(serializedIndex()), 'кноп');

    expect(searchItems(hits)).toEqual([
      { value: '/components/button#sizes', label: 'Button › Размеры' },
      { value: '/components/button', label: 'Button' },
      { value: '/guide/forms', label: 'Формы' },
      { value: '/changelog', label: 'Изменения' },
    ]);

    expect(snippetsOf(hits).get('/guide/forms')).toEqual([
      { text: 'Кнопка', hit: true },
      { text: ' отправляет форму.', hit: false },
    ]);
  });

  it('lists the pages before anything is typed', () => {
    const pages = [
      { text: 'Начало работы', link: '/guide/getting-started' },
      { text: 'Button', link: '/components/button' },
    ];

    expect(pageItems(pages)).toEqual([
      { value: '/guide/getting-started', label: 'Начало работы', icon: 'file' },
      { value: '/components/button', label: 'Button', icon: 'file' },
    ]);
  });

  it('names the header section of a page outside the docs section', () => {
    const sections = namedSections([
      { text: 'Документация', link: '/guide/getting-started', sections: ['/guide/'] },
      { text: 'Компоненты', link: '/components/button', sections: ['/components/'] },
    ]);

    expect(sections).toEqual([{ label: 'Компоненты', prefixes: ['/components/'] }]);

    expect(
      ['/components/button#sizes', '/guide/forms', '/changelog'].map((link) =>
        sectionOf(link, sections),
      ),
    ).toEqual(['Компоненты', undefined, undefined]);
  });

  it('loads a locale index on demand and yields nothing for a locale without one', async () => {
    const loaded = await loadSearchIndex(() => Promise.resolve({ default: serializedIndex() }));

    expect(loaded === null ? [] : searchHits(loaded, 'формы').map((hit) => hit.label)).toEqual([
      'Формы',
    ]);

    expect(await loadSearchIndex(undefined)).toBeNull();
  });

  it('caps the number of results', () => {
    expect(searchHits(createSearchIndex(serializedIndex()), 'кноп', 1)).toHaveLength(1);
    expect(searchHits(createSearchIndex(serializedIndex()), 'zzz')).toEqual([]);
  });
});
