import MiniSearch, { type Options, type SearchResult } from 'minisearch';
import type { NuiCommandItem } from '@numior/vue';

export interface SearchRecord {
  readonly title: string;
  readonly titles: readonly string[];
}

export type SearchIndex = MiniSearch<SearchRecord>;

export type SearchIndexLoader = () => Promise<{ readonly default: string }>;

export const searchFields = (): Pick<Options<SearchRecord>, 'fields' | 'storeFields'> => ({
  fields: ['title', 'titles', 'text'],
  storeFields: ['title', 'titles'],
});

const SEARCH_OPTIONS = {
  fuzzy: 0.2,
  prefix: true,
  boost: { title: 4, text: 2, titles: 1 },
} as const;

const isStrings = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const itemOf = (result: SearchResult): NuiCommandItem | undefined => {
  const { id, title, titles } = result;

  if (typeof id !== 'string' || typeof title !== 'string' || !isStrings(titles)) {
    return undefined;
  }
  return titles.length === 0
    ? { value: id, label: title }
    : { value: id, label: title, description: titles.join(' › ') };
};

export const createSearchIndex = (json: string): SearchIndex =>
  MiniSearch.loadJSON<SearchRecord>(json, { ...searchFields(), searchOptions: SEARCH_OPTIONS });

export const loadSearchIndex = async (
  loader: SearchIndexLoader | undefined,
): Promise<SearchIndex | null> =>
  loader === undefined ? null : createSearchIndex((await loader()).default);

export const searchItems = (index: SearchIndex, query: string, limit = 12): NuiCommandItem[] =>
  index
    .search(query)
    .slice(0, limit)
    .flatMap((result) => {
      const item = itemOf(result);

      return item === undefined ? [] : [item];
    });
