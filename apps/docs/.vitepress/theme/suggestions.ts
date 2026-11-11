import MiniSearch from 'minisearch';
import type { DocsSidebarItem } from './theme.types';

interface LinkRecord {
  readonly id: string;
  readonly text: string;
  readonly slug: string;
}

const SLUG_FIELD = 'slug';
const WORD_SEPARATOR_RE = /[^\p{L}\p{N}]+/u;
const SEARCH_OPTIONS = { fuzzy: 0.34, prefix: true } as const;

const slugOf = (path: string): string =>
  path
    .replace(/\.html$/u, '')
    .split('/')
    .findLast((segment) => segment !== '') ?? '';

const wordsOf = (slug: string): string[] =>
  slug.split(WORD_SEPARATOR_RE).filter((word) => word !== '');

export const suggestionsOf = (
  path: string,
  links: readonly DocsSidebarItem[],
  limit = 3,
): DocsSidebarItem[] => {
  const query = wordsOf(slugOf(path)).join(' ');

  if (query === '') {
    return [];
  }

  const index = new MiniSearch<LinkRecord>({
    fields: [SLUG_FIELD],
    storeFields: ['text'],
    tokenize: wordsOf,
    searchOptions: SEARCH_OPTIONS,
  });

  index.addAll(links.map((link) => ({ id: link.link, text: link.text, slug: slugOf(link.link) })));

  return index
    .search(query)
    .slice(0, limit)
    .reduce<DocsSidebarItem[]>((found, { id, text }) => {
      if (typeof id === 'string' && typeof text === 'string') {
        found.push({ link: id, text });
      }
      return found;
    }, []);
};
