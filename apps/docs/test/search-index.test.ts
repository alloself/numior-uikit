import MiniSearch from 'minisearch';
import { describe, expect, it } from 'vitest';
import {
  createSearchIndex,
  loadSearchIndex,
  searchFields,
  searchItems,
} from '../.vitepress/theme/search-index';

interface SearchDocument {
  readonly id: string;
  readonly title: string;
  readonly titles: readonly string[];
  readonly text: string;
}

const DOCUMENTS: readonly SearchDocument[] = [
  { id: '/components/button', title: 'Кнопка', titles: [], text: 'Нативная кнопка.' },
  { id: '/components/button#размеры', title: 'Размеры', titles: ['Кнопка'], text: 'Три ступени.' },
  { id: '/components/select', title: 'Выбор из списка', titles: [], text: 'Кнопка со списком.' },
];

const serializedIndex = (): string => {
  const index = new MiniSearch<SearchDocument>(searchFields());

  index.addAll([...DOCUMENTS]);
  return JSON.stringify(index);
};

describe('docs search index', () => {
  it('finds sections by a word prefix and joins parent titles into the description', () => {
    const items = searchItems(createSearchIndex(serializedIndex()), 'кноп');

    expect(items.map((item) => item.value)).toEqual([
      '/components/button',
      '/components/button#размеры',
      '/components/select',
    ]);

    expect(items[0]).toEqual({ value: '/components/button', label: 'Кнопка' });
    expect(items[1]?.description).toBe('Кнопка');
  });

  it('loads a locale index on demand and yields nothing for a locale without one', async () => {
    const loaded = await loadSearchIndex(() => Promise.resolve({ default: serializedIndex() }));

    expect(loaded === null ? [] : searchItems(loaded, 'выбор').map((item) => item.label)).toEqual([
      'Выбор из списка',
    ]);

    expect(await loadSearchIndex(undefined)).toBeNull();
  });

  it('caps the number of results', () => {
    expect(searchItems(createSearchIndex(serializedIndex()), 'кноп', 1)).toHaveLength(1);
    expect(searchItems(createSearchIndex(serializedIndex()), 'zzz')).toEqual([]);
  });
});
