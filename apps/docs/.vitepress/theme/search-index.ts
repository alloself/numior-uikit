import MiniSearch, { type Options, type SearchResult } from 'minisearch';
import { escapeRegExp } from 'lodash-es';
import type { NuiCommandItem, NuiCommandSource } from '@numior/vue';

export interface SearchRecord {
  readonly title: string;
  readonly titles: readonly string[];
  readonly text: string;
}

export interface SnippetPart {
  readonly text: string;
  readonly hit: boolean;
}

export interface SearchHit {
  readonly link: string;
  readonly label: string;
  readonly snippet: readonly SnippetPart[];
}

export interface SearchPage {
  readonly text: string;
  readonly link: string;
}

export interface SearchSection {
  readonly label: string;
  readonly prefixes: readonly string[];
}

export type SearchFields = Pick<Options<SearchRecord>, 'fields' | 'storeFields'>;

export type SearchIndex = MiniSearch<SearchRecord>;

export type SearchIndexLoader = () => Promise<{ readonly default: string }>;

const TEXT_FIELD = 'text';
const PATH_SEPARATOR = ' › ';
const ELLIPSIS = '…';
const SNIPPET_LEAD = 40;
const SNIPPET_LENGTH = 140;
const ENTITY_RE = /&(?:amp|lt|gt|quot|#39);/g;

const ENTITIES = new Map([
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
]);

const SEARCH_OPTIONS = {
  fuzzy: 0.2,
  prefix: true,
  boost: { title: 4, text: 2, titles: 1 },
} as const;

export const searchFields = (): SearchFields => ({
  fields: ['title', 'titles', TEXT_FIELD],
  storeFields: ['title', 'titles', TEXT_FIELD],
});

const isStrings = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const plainText = (text: string): string =>
  text
    .replaceAll(ENTITY_RE, (entity) => ENTITIES.get(entity) ?? entity)
    .replaceAll(/\s+/g, ' ')
    .trim();

const textTerms = (result: SearchResult): string[] =>
  result.terms.filter((term) => result.match[term]?.includes(TEXT_FIELD) === true);

const firstMatch = (text: string, terms: readonly string[]): number => {
  const lower = text.toLowerCase();

  return terms.reduce((first, term) => {
    const at = lower.indexOf(term);

    return at >= 0 && (first < 0 || at < first) ? at : first;
  }, -1);
};

const windowOf = (text: string, at: number): string => {
  const from = at <= SNIPPET_LEAD ? 0 : text.indexOf(' ', at - SNIPPET_LEAD) + 1;
  const limit = from + SNIPPET_LENGTH;
  const to = limit >= text.length ? text.length : text.lastIndexOf(' ', limit);
  const end = to <= at ? Math.min(text.length, limit) : to;

  return `${from > 0 ? ELLIPSIS : ''}${text.slice(from, end)}${end < text.length ? ELLIPSIS : ''}`;
};

export const snippetOf = (text: string, terms: readonly string[]): SnippetPart[] => {
  const plain = plainText(text);
  const at = firstMatch(plain, terms);

  if (at < 0) {
    return [];
  }

  const pattern = terms
    .toSorted((a, b) => b.length - a.length)
    .map((term) => escapeRegExp(term))
    .join('|');

  return windowOf(plain, at)
    .split(new RegExp(`(${pattern})`, 'giu'))
    .reduce<SnippetPart[]>((parts, part, index) => {
      if (part !== '') {
        parts.push({ text: part, hit: index % 2 === 1 });
      }
      return parts;
    }, []);
};

const hitOf = (result: SearchResult): SearchHit | undefined => {
  const { id, title, titles, text } = result;

  if (typeof id !== 'string' || typeof title !== 'string' || !isStrings(titles)) {
    return undefined;
  }
  return {
    link: id,
    label: [...titles, title].join(PATH_SEPARATOR),
    snippet: typeof text === 'string' ? snippetOf(text, textTerms(result)) : [],
  };
};

export const createSearchIndex = (json: string): SearchIndex =>
  MiniSearch.loadJSON<SearchRecord>(json, { ...searchFields(), searchOptions: SEARCH_OPTIONS });

export const loadSearchIndex = async (
  loader: SearchIndexLoader | undefined,
): Promise<SearchIndex | null> =>
  loader === undefined ? null : createSearchIndex((await loader()).default);

export const searchHits = (index: SearchIndex, query: string, limit = 12): SearchHit[] =>
  index
    .search(query)
    .slice(0, limit)
    .reduce<SearchHit[]>((hits, result) => {
      const hit = hitOf(result);

      if (hit !== undefined) {
        hits.push(hit);
      }
      return hits;
    }, []);

const itemOf = (hit: SearchHit): NuiCommandItem => ({ value: hit.link, label: hit.label });

const sectionOf = (link: string, sections: readonly SearchSection[], fallback: string): string =>
  sections.find((section) => section.prefixes.some((prefix) => link.startsWith(prefix)))?.label ??
  fallback;

const grouped = (
  items: readonly NuiCommandItem[],
  sections: readonly SearchSection[],
  fallback: string,
): NuiCommandSource => {
  const groups = items.reduce((found, item) => {
    const label = sectionOf(item.value, sections, fallback);

    found.set(label, [...(found.get(label) ?? []), item]);
    return found;
  }, new Map<string, NuiCommandItem[]>());

  return [...groups].map(([label, entries]) => ({ label, items: entries }));
};

export const searchGroups = (
  hits: readonly SearchHit[],
  sections: readonly SearchSection[],
  fallback: string,
): NuiCommandSource => grouped(hits.map(itemOf), sections, fallback);

export const pageGroups = (
  pages: readonly SearchPage[],
  sections: readonly SearchSection[],
  fallback: string,
): NuiCommandSource =>
  grouped(
    pages.map((page) => ({ value: page.link, label: page.text, icon: 'file' })),
    sections,
    fallback,
  );

export const snippetsOf = (
  hits: readonly SearchHit[],
): ReadonlyMap<string, readonly SnippetPart[]> =>
  new Map(hits.map((hit) => [hit.link, hit.snippet]));
